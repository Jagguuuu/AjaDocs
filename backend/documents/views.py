from django.db.models import Prefetch, Q
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .activity import activities_visible_to, record_activity, record_document_change
from .models import Document, DocumentActivity, DocumentShare
from .permissions import IsDocumentOwnerOrShared
from .serializers import DocumentActivitySerializer, DocumentSerializer, DocumentShareSerializer
from .utils import (
    ALLOWED_IMPORT_EXTENSIONS,
    MAX_IMPORT_BYTES,
    markdown_to_html,
    text_to_html,
    title_from_filename,
)


def documents_visible_to(user):
    return (
        Document.objects.filter(Q(owner=user) | Q(shares__shared_with=user))
        .distinct()
        .select_related("owner")
        .prefetch_related(
            Prefetch(
                "shares",
                queryset=DocumentShare.objects.filter(shared_with=user),
                to_attr="current_user_shares",
            )
        )
        .order_by("-updated_at")
    )


def get_share_document(user, document_id):
    try:
        document = Document.objects.get(pk=document_id)
    except Document.DoesNotExist as exc:
        raise NotFound() from exc
    if document.owner_id == user.id:
        return document
    if document.shares.filter(shared_with=user).exists():
        raise PermissionDenied("Only the owner can manage sharing.")
    raise NotFound()


class DocumentListCreateView(generics.ListCreateAPIView):
    serializer_class = DocumentSerializer

    def get_queryset(self):
        return documents_visible_to(self.request.user)

    def perform_create(self, serializer):
        document = serializer.save(owner=self.request.user)
        record_activity(document, self.request.user, DocumentActivity.CREATED)


class DocumentDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated, IsDocumentOwnerOrShared]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return documents_visible_to(self.request.user)

    def perform_update(self, serializer):
        document = serializer.instance
        old_title = document.title
        old_content = document.content
        saved = serializer.save()
        record_document_change(
            document=saved,
            actor=self.request.user,
            old_title=old_title,
            old_content=old_content,
        )


class DocumentActivityListView(generics.ListAPIView):
    serializer_class = DocumentActivitySerializer

    def get_queryset(self):
        return activities_visible_to(self.request.user)


class DocumentShareListCreateView(generics.ListCreateAPIView):
    serializer_class = DocumentShareSerializer

    def get_document(self):
        return get_share_document(self.request.user, self.kwargs["document_id"])

    def get_queryset(self):
        return DocumentShare.objects.filter(document=self.get_document()).select_related(
            "shared_with"
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["document"] = self.get_document()
        return context


class DocumentShareDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DocumentShareSerializer
    http_method_names = ["patch", "delete", "head", "options"]

    def get_document(self):
        return get_share_document(self.request.user, self.kwargs["document_id"])

    def get_queryset(self):
        return DocumentShare.objects.filter(document=self.get_document()).select_related(
            "shared_with"
        )


class DocumentImportView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        upload = request.FILES.get("file")
        if upload is None:
            return Response({"file": ["A .txt or .md file is required."]}, status=status.HTTP_400_BAD_REQUEST)

        if upload.size > MAX_IMPORT_BYTES:
            return Response(
                {"detail": "File must be 1MB or smaller."},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        extension = ""
        if upload.name and "." in upload.name:
            extension = "." + upload.name.rsplit(".", 1)[-1].lower()
        if extension not in ALLOWED_IMPORT_EXTENSIONS:
            return Response(
                {"file": ["Only .txt and .md files can be imported."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            text = upload.read().decode("utf-8")
        except UnicodeDecodeError:
            return Response({"file": ["File must be valid UTF-8."]}, status=status.HTTP_400_BAD_REQUEST)

        html = text_to_html(text) if extension == ".txt" else markdown_to_html(text)
        document = Document.objects.create(
            owner=request.user,
            title=title_from_filename(upload.name),
            content=html,
        )
        record_activity(document, request.user, DocumentActivity.CREATED)
        serializer = DocumentSerializer(document, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
