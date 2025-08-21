from django.shortcuts import render
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from .serializers import RegisterSerializer, UserSerializer, LoginSerializer, ChangePasswordSerializer

# Create your views here.

class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

class LoginView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer

    def get(self, request):
        
        return Response({"detail": "POST email and password to log in."})

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        user = authenticate(request, email=email, password=password)
        if user:
            login(request, user)
            return Response({"detail": "Logged in"})
        return Response({"detail": "Invalid credentials"}, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({"detail": "Logged out"})

class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer
    def get_object(self):
        return self.request.user

class ChangePasswordView(generics.UpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)

        if not user.check_password(ser.validated_data["current_password"]):
            return Response({"current_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(ser.validated_data["new_password"])
        user.save()
        return Response({"detail": "Password changed."})