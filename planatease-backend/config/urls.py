"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.shortcuts import render

def landing(request):
    if "127.0.0.1" in request.get_host() or "localhost" in request.get_host():
        admin_url = "http://127.0.0.1:8000/admin"
    else:
        admin_url = "https://planatease.onrender.com/admin"
    return render(request, "index.html", {"admin_url": admin_url})

urlpatterns = [
    path("", landing, name="landing"),
    path('admin/', admin.site.urls),
    path("auth/", include("users.urls", namespace="users")),
    path("auth/", include("djoser.urls")),
    path("api/trips/", include("trips.urls", namespace="trips")),
    path("api/contact/", include("contact.urls", namespace="contact")),
]
