from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from unittest.mock import patch, MagicMock
from users.tests.utils import create_user, create_inactive_user

client = APIClient()

class RegisterAndLoginFlowTests(TestCase):
    @patch("users.views.djoser_settings")
    def test_register_creates_inactive_and_sends_activation_email(self, mock_settings):
        mock_email_obj = MagicMock()
        mock_settings.EMAIL.activation.return_value = mock_email_obj

        url = reverse("users:register")
        res = client.post(url, {
            "email":"new@example.com","full_name":"New",
            "password":"password123","password2":"password123"
        }, format="json")
        self.assertEqual(res.status_code, 201)

        mock_settings.EMAIL.activation.assert_called()
        mock_email_obj.send.assert_called_with(["new@example.com"])

        from django.contrib.auth import get_user_model
        User = get_user_model()
        u = User.objects.get(email="new@example.com")
        self.assertFalse(u.is_active)

    def test_login_get_message(self):
        url = reverse("users:login")
        res = client.get(url)
        self.assertEqual(res.status_code, 200)
        self.assertIn("POST email and password", res.data["detail"])

    def test_login_and_logout(self):
        user = create_user(email="log@example.com", password="12345678")
        res = client.post(reverse("users:login"), {
            "email":"log@example.com","password":"12345678"
        }, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertIn("Logged in", res.data["detail"])

        res2 = client.post(reverse("users:logout"))
        self.assertEqual(res2.status_code, 200)
        self.assertIn("Logged out", res2.data["detail"])

    def test_login_invalid(self):
        res = client.post(reverse("users:login"), {
            "email":"none@example.com","password":"wrong"
        }, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Invalid credentials", res.data["detail"])
