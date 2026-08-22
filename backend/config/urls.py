from django.contrib import admin
from django.urls import include, path, re_path

from .views import spa_view

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/documents/", include("documents.urls")),
    re_path(r"^(?!api(?:/|$)|admin(?:/|$))(?P<path>.*)$", spa_view),
]
