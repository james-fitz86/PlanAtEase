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
from django.http import HttpResponse

def landing(_request):
    return HttpResponse(
        """<!doctype html>
<title>PlanAtEase API</title>
<main style="font-family:sans-serif;max-width:680px;margin:4rem auto;padding:1rem;text-align:center">
  <h1>PlanAtEase API</h1>
  <p>Frontend: <a href="https://planatease.netlify.app">planatease.netlify.app</a></p>
</main>""",
        content_type="text/html",
    )

urlpatterns = [
    path("", landing, name="landing"),
    path('admin/', admin.site.urls),
    path("auth/", include("users.urls", namespace="users")),
    path("auth/", include("djoser.urls")),
    path("api/trips/", include("trips.urls", namespace="trips")),
]
