from django.test import TestCase, override_settings
from django.urls import resolve
from django.urls.resolvers import URLResolver

from config import urls as config_urls
from config.urls import landing


@override_settings(ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1", "planatease.site"])
class ConfigURLsTests(TestCase):
    def test_landing_renders_index_and_uses_local_admin_on_127001(self):
        resp = self.client.get("/", HTTP_HOST="127.0.0.1:8000")
        self.assertEqual(resp.status_code, 200)
        self.assertTemplateUsed(resp, "index.html")
        self.assertIn("admin_url", resp.context)
        self.assertEqual(resp.context["admin_url"], "http://127.0.0.1:8000/admin")

    def test_landing_renders_index_and_uses_local_admin_on_localhost(self):
        resp = self.client.get("/", HTTP_HOST="localhost:8000")
        self.assertEqual(resp.status_code, 200)
        self.assertTemplateUsed(resp, "index.html")
        self.assertEqual(resp.context["admin_url"], "http://127.0.0.1:8000/admin")

    def test_landing_uses_render_admin_on_non_local_host(self):
        resp = self.client.get("/", HTTP_HOST="planatease.site")
        self.assertEqual(resp.status_code, 200)
        self.assertTemplateUsed(resp, "index.html")
        self.assertEqual(resp.context["admin_url"], "https://planatease.onrender.com/admin")

    def test_root_path_resolves_to_landing(self):
        match = resolve("/")
        self.assertEqual(match.func, landing)

    def test_admin_path_exists(self):
        resp = self.client.get("/admin/")
        self.assertIn(resp.status_code, {200, 301, 302})

    def test_auth_includes_present_twice(self):
        auth_includes = [
            p for p in config_urls.urlpatterns
            if isinstance(p, URLResolver) and getattr(p.pattern, "_route", "") == "auth/"
        ]
        self.assertGreaterEqual(len(auth_includes), 2)

    def test_trips_include_present(self):
        trips_includes = [
            p for p in config_urls.urlpatterns
            if isinstance(p, URLResolver) and getattr(p.pattern, "_route", "") == "api/trips/"
        ]
        self.assertEqual(len(trips_includes), 1)

