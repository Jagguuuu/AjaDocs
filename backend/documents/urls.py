from django.urls import path

from .views import (
    DocumentActivityListView,
    DocumentDetailView,
    DocumentImportView,
    DocumentListCreateView,
    DocumentShareDetailView,
    DocumentShareListCreateView,
)

urlpatterns = [
    path("", DocumentListCreateView.as_view(), name="document-list"),
    path("activity/", DocumentActivityListView.as_view(), name="document-activity"),
    path("import/", DocumentImportView.as_view(), name="document-import"),
    path("<uuid:pk>/", DocumentDetailView.as_view(), name="document-detail"),
    path("<uuid:document_id>/shares/", DocumentShareListCreateView.as_view(), name="document-shares"),
    path(
        "<uuid:document_id>/shares/<uuid:pk>/",
        DocumentShareDetailView.as_view(),
        name="document-share-detail",
    ),
]
