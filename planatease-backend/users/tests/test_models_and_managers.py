from django.test import TestCase
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

User = get_user_model()

class UserModelManagerTests(TestCase):
    def test_create_user_normalizes_email_and_sets_flags(self):
        u = User.objects.create_user(email="MiXeD@Example.COM", password="x")
        self.assertEqual(u.email, "MiXeD@example.com")
        self.assertFalse(u.is_staff)
        self.assertFalse(u.is_superuser)
        self.assertTrue(u.check_password("x"))

    def test_create_user_requires_email(self):
        with self.assertRaisesMessage(ValueError, "The Email field must be set"):
            User.objects.create_user(email="", password="x")

    def test_create_superuser_sets_flags(self):
        su = User.objects.create_superuser(email="admin@example.com", password="x")
        self.assertTrue(su.is_staff)
        self.assertTrue(su.is_superuser)

    def test_create_superuser_validates_flags(self):
        with self.assertRaisesMessage(ValueError, "Superuser must have is_staff=True."):
            User.objects.create_superuser(email="a@e.com", password="x", is_staff=False)
        with self.assertRaisesMessage(ValueError, "Superuser must have is_superuser=True."):
            User.objects.create_superuser(email="b@e.com", password="x", is_superuser=False)

    def test_str_returns_email(self):
        u = User.objects.create_user(email="s@example.com", password="x")
        self.assertEqual(str(u), "s@example.com")
