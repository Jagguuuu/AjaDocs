from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import DocumentShare


class IsDocumentOwnerOrShared(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        if obj.owner_id == user.id:
            return True

        share = obj.shares.filter(shared_with=user).first()
        if share is None:
            return False
        if request.method in SAFE_METHODS:
            return True
        return share.permission == DocumentShare.EDIT
