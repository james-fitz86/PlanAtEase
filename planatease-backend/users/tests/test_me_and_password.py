from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from users.tests.utils import create_user
import sys
import types

client = APIClient()

class MeAndPasswordTests(TestCase):
    def setUp(self):
        self.user = create_user(email="me@example.com", password="pass123456")
        client.force_authenticate(self.user)

    def test_me_get_calls_promote_guest_trips_when_available(self):
        trips = types.ModuleType("trips")
        services = types.ModuleType("trips.services")
        called = {"flag": False}
        def promote_guest_trips_to_user(request, user):
            called["flag"] = True
        services.promote_guest_trips_to_user = promote_guest_trips_to_user
        sys.modules["trips"] = trips
        sys.modules["trips.services"] = services

        res = client.get(reverse("users:me"))
        self.assertEqual(res.status_code, 200)
        self.assertTrue(called["flag"])

        del sys.modules["trips.services"]
        del sys.modules["trips"]

    def test_me_patch_updates_profile_and_lowercases_email(self):
        res = client.patch(reverse("users:me"), {
            "email":"UPPER@EXAMPLE.com",
            "full_name":"New Name",
            "home_location":"Dublin",
        }, format="json")
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "upper@example.com")
        self.assertEqual(self.user.full_name, "New Name")
        self.assertEqual(self.user.home_location, "Dublin")

    def test_change_password_success(self):
        res = client.put(reverse("users:change-password"), {
            "current_password":"pass123456",
            "new_password":"NewPass123!",
            "new_password2":"NewPass123!",
        }, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertIn("Password changed", res.data["detail"])

    def test_change_password_wrong_current(self):
        res = client.put(reverse("users:change-password"), {
            "current_password":"wrong",
            "new_password":"NewPass123!",
            "new_password2":"NewPass123!",
        }, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Wrong password", str(res.data))

    def test_me_get_handles_missing_trips_services_gracefully(self):
        sys.modules.pop("trips.services", None)
        sys.modules["trips"] = types.ModuleType("trips")

        res = client.get(reverse("users:me"))
        self.assertEqual(res.status_code, 200)

        sys.modules.pop("trips", None)

    def test_change_password_allows_login_with_new_password(self):
        res = client.put(reverse("users:change-password"), {
            "current_password": "pass123456",
            "new_password": "BrandNew123!",
            "new_password2": "BrandNew123!",
        }, format="json")
        self.assertEqual(res.status_code, 200)

        client.logout()
        res_login = client.post(reverse("users:login"), {
            "email": "me@example.com",
            "password": "BrandNew123!",
        }, format="json")
        self.assertEqual(res_login.status_code, 200)
        self.assertIn("Logged in", res_login.data["detail"])