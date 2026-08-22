from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from .models import Document, DocumentActivity, DocumentShare


class DocumentApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="alice",
            email="alice@example.com",
            password="SecurePass123!",
        )
        self.other = User.objects.create_user(
            username="bob",
            email="bob@example.com",
            password="SecurePass123!",
        )

    def test_owner_crud_and_other_user_cannot_access(self):
        self.client.force_authenticate(self.owner)

        create_response = self.client.post(
            "/api/documents/",
            {"title": "  Notes  ", "content": "<p>Hello</p>"},
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(create_response.data["title"], "Notes")
        self.assertEqual(create_response.data["content"], "<p>Hello</p>")
        self.assertEqual(create_response.data["access"], "owner")
        self.assertIn("id", create_response.data)
        self.assertIn("updated_at", create_response.data)
        self.assertNotIn("password", create_response.data)
        document_id = create_response.data["id"]

        list_response = self.client.get("/api/documents/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["id"], document_id)
        self.assertEqual(list_response.data[0]["title"], "Notes")

        rename_response = self.client.patch(
            f"/api/documents/{document_id}/",
            {"title": "  Renamed  "},
            format="json",
        )
        self.assertEqual(rename_response.status_code, 200)
        self.assertEqual(rename_response.data["title"], "Renamed")
        self.assertEqual(rename_response.data["content"], "<p>Hello</p>")

        html = "<p>  spaced content  </p>"
        update_response = self.client.patch(
            f"/api/documents/{document_id}/",
            {"content": html},
            format="json",
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.data["content"], html)
        self.assertEqual(update_response.data["title"], "Renamed")
        self.assertEqual(update_response.data["access"], "owner")

        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f"/api/documents/{document_id}/").status_code, 404)
        self.assertEqual(
            self.client.patch(
                f"/api/documents/{document_id}/",
                {"title": "Hacked"},
                format="json",
            ).status_code,
            404,
        )
        other_list = self.client.get("/api/documents/")
        self.assertEqual(other_list.status_code, 200)
        self.assertEqual(other_list.data, [])
        self.assertFalse(Document.objects.filter(owner=self.other).exists())


class DocumentShareApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="SecurePass123!",
        )
        self.editor = User.objects.create_user(
            username="editor",
            email="editor@example.com",
            password="SecurePass123!",
        )
        self.viewer = User.objects.create_user(
            username="viewer",
            email="viewer@example.com",
            password="SecurePass123!",
        )
        self.stranger = User.objects.create_user(
            username="stranger",
            email="stranger@example.com",
            password="SecurePass123!",
        )
        self.client.force_authenticate(self.owner)
        created = self.client.post(
            "/api/documents/",
            {"title": "Shared notes", "content": "<p>Original</p>"},
            format="json",
        )
        self.document_id = created.data["id"]

    def test_share_edit_can_patch_view_forbidden_unrelated_not_found(self):
        edit_share = self.client.post(
            f"/api/documents/{self.document_id}/shares/",
            {"email": "editor@example.com", "permission": "edit"},
            format="json",
        )
        self.assertEqual(edit_share.status_code, 201)
        self.assertEqual(edit_share.data["permission"], DocumentShare.EDIT)

        view_share = self.client.post(
            f"/api/documents/{self.document_id}/shares/",
            {"email": "viewer@example.com", "permission": "view"},
            format="json",
        )
        self.assertEqual(view_share.status_code, 201)
        self.assertEqual(view_share.data["permission"], DocumentShare.VIEW)

        self.client.force_authenticate(self.editor)
        editor_get = self.client.get(f"/api/documents/{self.document_id}/")
        self.assertEqual(editor_get.status_code, 200)
        self.assertEqual(editor_get.data["access"], "edit")
        editor_patch = self.client.patch(
            f"/api/documents/{self.document_id}/",
            {"content": "<p>Edited</p>"},
            format="json",
        )
        self.assertEqual(editor_patch.status_code, 200)
        self.assertEqual(editor_patch.data["content"], "<p>Edited</p>")

        self.client.force_authenticate(self.viewer)
        viewer_get = self.client.get(f"/api/documents/{self.document_id}/")
        self.assertEqual(viewer_get.status_code, 200)
        self.assertEqual(viewer_get.data["access"], "view")
        viewer_patch = self.client.patch(
            f"/api/documents/{self.document_id}/",
            {"content": "<p>Should fail</p>"},
            format="json",
        )
        self.assertEqual(viewer_patch.status_code, 403)

        self.client.force_authenticate(self.stranger)
        self.assertEqual(self.client.get(f"/api/documents/{self.document_id}/").status_code, 404)
        self.assertEqual(
            self.client.patch(
                f"/api/documents/{self.document_id}/",
                {"title": "Hacked"},
                format="json",
            ).status_code,
            404,
        )


class DocumentActivityApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="SecurePass123!",
        )
        self.editor = User.objects.create_user(
            username="editor",
            email="editor@example.com",
            password="SecurePass123!",
        )
        self.viewer = User.objects.create_user(
            username="viewer",
            email="viewer@example.com",
            password="SecurePass123!",
        )
        self.stranger = User.objects.create_user(
            username="stranger",
            email="stranger@example.com",
            password="SecurePass123!",
        )
        self.client.force_authenticate(self.owner)
        created = self.client.post(
            "/api/documents/",
            {"title": "Shared notes", "content": "<p>Original</p>"},
            format="json",
        )
        self.document_id = created.data["id"]
        self.client.post(
            f"/api/documents/{self.document_id}/shares/",
            {"email": "editor@example.com", "permission": "edit"},
            format="json",
        )
        self.client.post(
            f"/api/documents/{self.document_id}/shares/",
            {"email": "viewer@example.com", "permission": "view"},
            format="json",
        )

    def test_owner_and_editor_changes_appear_in_history(self):
        self.client.patch(
            f"/api/documents/{self.document_id}/",
            {"content": "<p>Owner edit</p>"},
            format="json",
        )
        self.client.force_authenticate(self.editor)
        self.client.patch(
            f"/api/documents/{self.document_id}/",
            {"content": "<p>Editor edit</p>"},
            format="json",
        )

        self.client.force_authenticate(self.owner)
        owner_history = self.client.get("/api/documents/activity/")
        self.assertEqual(owner_history.status_code, 200)
        messages = [item["message"] for item in owner_history.data]
        self.assertIn("Owner created Shared notes", messages)
        self.assertIn("Owner changed Shared notes", messages)
        self.assertIn("Editor changed Shared notes", messages)

        self.client.force_authenticate(self.editor)
        editor_history = self.client.get("/api/documents/activity/")
        self.assertEqual(editor_history.status_code, 200)
        editor_messages = [item["message"] for item in editor_history.data]
        self.assertIn("Owner changed Shared notes", editor_messages)
        self.assertIn("Editor changed Shared notes", editor_messages)

    def test_viewer_sees_owner_changes_only(self):
        self.client.patch(
            f"/api/documents/{self.document_id}/",
            {"content": "<p>Owner edit</p>"},
            format="json",
        )
        self.client.force_authenticate(self.editor)
        self.client.patch(
            f"/api/documents/{self.document_id}/",
            {"content": "<p>Editor edit</p>"},
            format="json",
        )

        self.client.force_authenticate(self.viewer)
        history = self.client.get("/api/documents/activity/")
        self.assertEqual(history.status_code, 200)
        messages = [item["message"] for item in history.data]
        self.assertIn("Owner created Shared notes", messages)
        self.assertIn("Owner changed Shared notes", messages)
        self.assertNotIn("Editor changed Shared notes", messages)

        self.client.force_authenticate(self.stranger)
        stranger_history = self.client.get("/api/documents/activity/")
        self.assertEqual(stranger_history.status_code, 200)
        self.assertEqual(stranger_history.data, [])

    def test_rapid_edits_coalesce_into_one_change(self):
        self.client.patch(
            f"/api/documents/{self.document_id}/",
            {"content": "<p>One</p>"},
            format="json",
        )
        self.client.patch(
            f"/api/documents/{self.document_id}/",
            {"content": "<p>Two</p>"},
            format="json",
        )
        updates = DocumentActivity.objects.filter(
            document_id=self.document_id,
            action=DocumentActivity.UPDATED,
        )
        self.assertEqual(updates.count(), 1)
        self.assertEqual(DocumentActivity.objects.filter(document_id=self.document_id).count(), 2)
