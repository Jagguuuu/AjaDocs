from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Document, DocumentActivity, DocumentShare


class DocumentSerializer(serializers.ModelSerializer):
    access = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    content = serializers.CharField(allow_blank=True, required=False, trim_whitespace=False)

    class Meta:
        model = Document
        fields = ("id", "title", "content", "updated_at", "access", "owner_name")
        read_only_fields = ("id", "updated_at", "access", "owner_name")

    def get_access(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            return "view"
        if obj.owner_id == user.id:
            return "owner"
        shares = getattr(obj, "current_user_shares", None)
        if shares:
            return shares[0].permission
        share = obj.shares.filter(shared_with=user).first()
        return share.permission if share else "view"

    def get_owner_name(self, obj):
        return obj.owner.username

    def validate_title(self, value):
        title = value.strip()
        if not title:
            raise serializers.ValidationError("Title cannot be blank.")
        return title


class DocumentShareSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(write_only=True, required=False)
    shared_with_email = serializers.EmailField(source="shared_with.email", read_only=True)
    shared_with_name = serializers.CharField(source="shared_with.username", read_only=True)

    class Meta:
        model = DocumentShare
        fields = (
            "id",
            "email",
            "permission",
            "shared_with_email",
            "shared_with_name",
            "created_at",
        )
        read_only_fields = ("id", "created_at", "shared_with_email", "shared_with_name")

    def validate_permission(self, value):
        if value not in {DocumentShare.VIEW, DocumentShare.EDIT}:
            raise serializers.ValidationError("Permission must be view or edit.")
        return value

    def create(self, validated_data):
        email = validated_data.pop("email", "").strip()
        if not email:
            raise serializers.ValidationError({"email": "Email is required."})

        document = self.context["document"]
        normalized = User.objects.normalize_email(email)
        user = User.objects.filter(email__iexact=normalized).first()
        if user is None:
            raise serializers.ValidationError({"email": "No user with this email."})
        if user.id == document.owner_id:
            raise serializers.ValidationError({"email": "You cannot share a document with yourself."})
        if DocumentShare.objects.filter(document=document, shared_with=user).exists():
            raise serializers.ValidationError({"email": "This user already has access."})

        return DocumentShare.objects.create(
            document=document,
            shared_with=user,
            permission=validated_data["permission"],
        )

    def update(self, instance, validated_data):
        validated_data.pop("email", None)
        instance.permission = validated_data.get("permission", instance.permission)
        instance.save(update_fields=["permission"])
        return instance


class DocumentActivitySerializer(serializers.ModelSerializer):
    document_id = serializers.UUIDField(source="document.id", read_only=True)
    message = serializers.SerializerMethodField()

    class Meta:
        model = DocumentActivity
        fields = (
            "id",
            "document_id",
            "document_title",
            "actor_name",
            "actor_role",
            "action",
            "message",
            "created_at",
        )
        read_only_fields = fields

    def get_message(self, obj):
        role = "Owner" if obj.actor_role == DocumentActivity.OWNER else "Editor"
        title = obj.document_title
        if obj.action == DocumentActivity.CREATED:
            return f"{role} created {title}"
        if obj.action == DocumentActivity.RENAMED:
            return f"{role} renamed {title}"
        return f"{role} changed {title}"

