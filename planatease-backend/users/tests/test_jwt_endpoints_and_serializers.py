from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from users.tests.utils import create_user, create_inactive_user

client = APIClient()

class JWTCreateEndpointTests(TestCase):
    def test_jwt_create_success_with_email_password(self):
        u = create_user(email="jwt@example.com", password="S3cret!!")
        res = client.post(reverse("users:jwt-create"), {
            "email":"jwt@example.com","password":"S3cret!!"
        }, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)

    def test_jwt_create_invalid_credentials(self):
        res = client.post(reverse("users:jwt-create"), {
            "email":"nope@example.com","password":"bad"
        }, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Invalid credentials", str(res.data))

    def test_jwt_create_inactive_user_rejected_by_authenticate(self):
        create_inactive_user(email="inactivejwt@example.com", password="P@ssword1")
        res = client.post(reverse("users:jwt-create"), {
            "email":"inactivejwt@example.com","password":"P@ssword1"
        }, format="json")
        self.assertEqual(res.status_code, 400)
