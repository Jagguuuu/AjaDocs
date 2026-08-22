from django.contrib.auth.models import User
from rest_framework.test import APITestCase


class AuthApiTests(APITestCase):
    def test_register_returns_tokens_and_me_requires_auth(self):
        register_response = self.client.post(
            "/api/auth/register/",
            {
                "username": "alice",
                "email": "Alice@Example.COM",
                "password": "SecurePass123!",
            },
            format="json",
        )

        self.assertEqual(register_response.status_code, 201)
        self.assertEqual(register_response.data["username"], "alice")
        self.assertEqual(register_response.data["email"], "Alice@example.com")
        self.assertIn("access", register_response.data)
        self.assertIn("refresh", register_response.data)
        self.assertNotIn("password", register_response.data)

        user = User.objects.get(username="alice")
        self.assertTrue(user.check_password("SecurePass123!"))
        self.assertNotEqual(user.password, "SecurePass123!")

        unauthenticated = self.client.get("/api/auth/me/")
        self.assertEqual(unauthenticated.status_code, 401)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {register_response.data['access']}"
        )
        me_response = self.client.get("/api/auth/me/")
        self.assertEqual(me_response.status_code, 200)
        self.assertEqual(
            me_response.data,
            {
                "id": user.id,
                "username": "alice",
                "email": "Alice@example.com",
            },
        )

    def test_register_rejects_duplicate_username_and_email(self):
        payload = {
            "username": "alice",
            "email": "alice@example.com",
            "password": "SecurePass123!",
        }
        self.assertEqual(self.client.post("/api/auth/register/", payload, format="json").status_code, 201)

        duplicate_username = self.client.post(
            "/api/auth/register/",
            {
                "username": "alice",
                "email": "other@example.com",
                "password": "SecurePass123!",
            },
            format="json",
        )
        self.assertEqual(duplicate_username.status_code, 400)
        self.assertIn("username", duplicate_username.data)

        duplicate_email = self.client.post(
            "/api/auth/register/",
            {
                "username": "bob",
                "email": "ALICE@example.com",
                "password": "SecurePass123!",
            },
            format="json",
        )
        self.assertEqual(duplicate_email.status_code, 400)
        self.assertIn("email", duplicate_email.data)
