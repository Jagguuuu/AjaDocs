import uuid

from django.conf import settings
from django.db import models
from django.utils.timezone import now as timezone_now


class Document(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_documents",
    )
    title = models.CharField(max_length=200)
    content = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title


class DocumentShare(models.Model):
    VIEW = "view"
    EDIT = "edit"
    PERMISSION_CHOICES = [
        (VIEW, "View"),
        (EDIT, "Edit"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="shares",
    )
    shared_with = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="document_shares",
    )
    permission = models.CharField(max_length=8, choices=PERMISSION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["document", "shared_with"],
                name="unique_document_share",
            ),
        ]


class DocumentActivity(models.Model):
    CREATED = "created"
    UPDATED = "updated"
    RENAMED = "renamed"
    ACTION_CHOICES = [
        (CREATED, "Created"),
        (UPDATED, "Updated"),
        (RENAMED, "Renamed"),
    ]

    OWNER = "owner"
    EDIT = "edit"
    ROLE_CHOICES = [
        (OWNER, "Owner"),
        (EDIT, "Editor"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="activities",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="document_activities",
    )
    actor_name = models.CharField(max_length=150)
    actor_role = models.CharField(max_length=8, choices=ROLE_CHOICES)
    action = models.CharField(max_length=16, choices=ACTION_CHOICES)
    document_title = models.CharField(max_length=200)
    created_at = models.DateTimeField(default=timezone_now)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["document", "created_at"], name="doc_activity_doc_time"),
        ]
