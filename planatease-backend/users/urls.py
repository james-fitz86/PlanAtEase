from django.urls import path
from .views import RegisterView, LoginView, LogoutView, MeView, ChangePasswordView
from rest_framework_simplejwt.views import (
    TokenObtainPairView, TokenRefreshView, TokenVerifyView
)
from .jwt_views import EmailTokenObtainPairView

app_name = "users"

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("me/password/", ChangePasswordView.as_view(), name="change-password"),

    path("jwt/refresh/", TokenRefreshView.as_view(),    name="jwt-refresh"),
    path("jwt/verify/",  TokenVerifyView.as_view(),     name="jwt-verify"),
    path("jwt/create/", EmailTokenObtainPairView.as_view(), name="jwt-create"),
]
