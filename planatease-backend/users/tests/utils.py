from django.contrib.auth import get_user_model

User = get_user_model()

def create_user(email="user@example.com", password="Passw0rd!23", **extra):
    defaults = dict(full_name="Test User", is_active=True)
    defaults.update(extra)
    user = User.objects.create_user(email=email, password=password, **defaults)
    return user

def create_inactive_user(email="inactive@example.com", password="Passw0rd!23", **extra):
    defaults = dict(full_name="Inactive", is_active=False)
    defaults.update(extra)
    return User.objects.create_user(email=email, password=password, **defaults)