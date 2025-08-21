from django.db import models
from django.contrib.auth.models import AbstractUser
from .managers import UserManager

# Create your models here.
class User(AbstractUser):
    username = None
    email = models.EmailField(unique=True)

    full_name = models.CharField(max_length=150, blank=True)
    profile_picture = models.URLField(blank=True, null=True)
    home_location = models.CharField(max_length=100, blank=True)
    preferences = models.JSONField(default=dict, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.email