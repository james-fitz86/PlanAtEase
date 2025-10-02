from django.test import TestCase
from django.contrib.auth import get_user_model
from users.serializers import (
    RegisterSerializer, UserSerializer, ChangePasswordSerializer,
    ActiveUserTokenObtainPairSerializer
)
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework_simplejwt.tokens import RefreshToken
from unittest.mock import patch

User = get_user_model()

class RegisterSerializerTests(TestCase):
    def test_passwords_must_match(self):
        s = RegisterSerializer(data={
            "email": "a@example.com",
            "full_name": "A",
            "password": "abcdefgh",
            "password2": "ijklmnop",
        })
        self.assertFalse(s.is_valid())
        self.assertIn("Passwords do not match", str(s.errors))

    def test_creates_user_lowercased_email(self):
        s = RegisterSerializer(data={
            "email":"MiX@Example.com","full_name":"A",
            "password":"12345678","password2":"12345678"
        })
        self.assertTrue(s.is_valid(), s.errors)
        u = s.save()
        self.assertEqual(u.email, "mix@example.com")
    
    def test_passwords_match_validates_ok(self):
        s = RegisterSerializer(data={
            "email": "ok@example.com",
            "full_name": "OK",
            "password": "abcdefgh",
            "password2": "abcdefgh",
        })
        self.assertTrue(s.is_valid(), s.errors)

class UserSerializerTests(TestCase):
    def setUp(self):
        self.u1 = User.objects.create_user("one@example.com", "x")
        self.u2 = User.objects.create_user("two@example.com", "x")

    def test_validate_email_unique_excludes_instance(self):
        ser = UserSerializer(instance=self.u1, data={"email":"one@example.com"}, partial=True)
        self.assertTrue(ser.is_valid(), ser.errors)

    def test_validate_email_unique(self):
        ser = UserSerializer(instance=self.u1, data={"email":"two@example.com"}, partial=True)
        self.assertFalse(ser.is_valid())
        self.assertIn("already exists", str(ser.errors))

    def test_update_lowercases_email(self):
        ser = UserSerializer(instance=self.u1, data={"email":"UP@EXAMPLE.com"}, partial=True)
        self.assertTrue(ser.is_valid(), ser.errors)
        u = ser.save()
        self.assertEqual(u.email, "up@example.com")

class ChangePasswordSerializerTests(TestCase):
    def test_new_passwords_must_match(self):
        s = ChangePasswordSerializer(data={
            "current_password":"a","new_password":"x","new_password2":"y"
        })
        self.assertFalse(s.is_valid())
        self.assertIn("Passwords do not match", str(s.errors))

class ActiveUserTokenSerializerTests(TestCase):
    def test_inactive_user_raises(self):
        u = User.objects.create_user("i@example.com", "x", is_active=False)
        s = ActiveUserTokenObtainPairSerializer(data={"email": "i@example.com", "password": "x"})
        with self.assertRaises(AuthenticationFailed):
            s.is_valid(raise_exception=True)

    def test_active_user_ok(self):
        u = User.objects.create_user("a@example.com","x", is_active=True)
        s = ActiveUserTokenObtainPairSerializer(data={"email":"a@example.com","password":"x"})
        self.assertTrue(s.is_valid(), s.errors)
        self.assertIn("access", s.validated_data)
        self.assertIn("refresh", s.validated_data)
        RefreshToken(s.validated_data["refresh"])

    def test_custom_inactive_check_runs_after_super_validate(self):
        u = User.objects.create_user("inactive2@example.com", "x", is_active=False)
        ser = ActiveUserTokenObtainPairSerializer()

        with patch("rest_framework_simplejwt.serializers.TokenObtainPairSerializer.validate", return_value={"access": "a", "refresh": "b"}):
            ser.user = u
            with self.assertRaises(ValidationError):
                ser.validate({"email": "inactive2@example.com", "password": "x"})