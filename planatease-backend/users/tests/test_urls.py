from django.test import SimpleTestCase
from django.urls import reverse, resolve
from users import views
from users.jwt_views import EmailTokenObtainPairView as EmailTokenObtainPairViewJWT

class UrlsResolveTests(SimpleTestCase):
    def test_register_url(self):
        self.assertEqual(resolve(reverse("users:register")).func.view_class, views.RegisterView)

    def test_login_url(self):
        self.assertEqual(resolve(reverse("users:login")).func.view_class, views.LoginView)

    def test_logout_url(self):
        self.assertEqual(resolve(reverse("users:logout")).func.view_class, views.LogoutView)

    def test_me_url(self):
        self.assertEqual(resolve(reverse("users:me")).func.view_class, views.MeView)

    def test_change_password_url(self):
        self.assertEqual(resolve(reverse("users:change-password")).func.view_class, views.ChangePasswordView)

    def test_jwt_urls(self):
        self.assertEqual(resolve(reverse("users:jwt-refresh")).url_name, "jwt-refresh")
        self.assertEqual(resolve(reverse("users:jwt-verify")).url_name, "jwt-verify")
        self.assertEqual(resolve(reverse("users:jwt-create")).func.view_class, EmailTokenObtainPairViewJWT)
