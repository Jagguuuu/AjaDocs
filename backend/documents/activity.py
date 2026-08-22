from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from .models import DocumentActivity, DocumentShare

COALESCE_WINDOW = timedelta(minutes=5)


def actor_role_for(document, user):
    if document.owner_id == user.id:
        return DocumentActivity.OWNER
    return DocumentActivity.EDIT


def record_activity(document, actor, action):
    role = actor_role_for(document, actor)
    now = timezone.now()
    if action != DocumentActivity.CREATED:
        recent = (
            DocumentActivity.objects.filter(
                document=document,
                actor=actor,
                action=action,
                created_at__gte=now - COALESCE_WINDOW,
            )
            .order_by("-created_at")
            .first()
        )
        if recent:
            recent.actor_name = actor.username
            recent.actor_role = role
            recent.document_title = document.title
            recent.created_at = now
            recent.save(update_fields=["actor_name", "actor_role", "document_title", "created_at"])
            return recent

    return DocumentActivity.objects.create(
        document=document,
        actor=actor,
        actor_name=actor.username,
        actor_role=role,
        action=action,
        document_title=document.title,
        created_at=now,
    )


def record_document_change(document, actor, old_title, old_content):
    title_changed = document.title != old_title
    content_changed = document.content != old_content
    if content_changed:
        record_activity(document, actor, DocumentActivity.UPDATED)
        return
    if title_changed:
        record_activity(document, actor, DocumentActivity.RENAMED)


def activities_visible_to(user):
    return (
        DocumentActivity.objects.filter(
            Q(document__owner=user)
            | Q(document__shares__shared_with=user, document__shares__permission=DocumentShare.EDIT)
            | Q(
                document__shares__shared_with=user,
                document__shares__permission=DocumentShare.VIEW,
                actor_role=DocumentActivity.OWNER,
            )
        )
        .distinct()
        .select_related("document")
        .order_by("-created_at")
    )
