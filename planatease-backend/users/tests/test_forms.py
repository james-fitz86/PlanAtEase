from django.test import TestCase
from users.forms import CustomUserCreationForm, CustomUserChangeForm
from django.contrib.auth import get_user_model

User = get_user_model()

class FormsTests(TestCase):
    def test_user_creation_form_passwords_must_match(self):
        form = CustomUserCreationForm(data={
            "email": "f@example.com", "full_name": "Foo",
            "password1": "abc123456", "password2": "different"
        })
        self.assertFalse(form.is_valid())
        self.assertIn("Passwords don't match", form.errors["password2"][0])

    def test_user_creation_form_saves_hashed_password(self):
        form = CustomUserCreationForm(data={
            "email": "f@example.com", "full_name": "Foo",
            "password1": "abc123456", "password2": "abc123456"
        })
        self.assertTrue(form.is_valid(), form.errors)
        user = form.save()
        self.assertTrue(user.check_password("abc123456"))

    def test_user_change_form_displays_ro_password(self):
        u = User.objects.create_user("c@example.com", "pass")
        form = CustomUserChangeForm(instance=u)
        rendered = str(form.fields["password"].widget.render("password", ""))
        self.assertTrue(
            "No password set" in rendered or "Set password" in rendered,
            f"Unexpected widget output: {rendered}"
        )
