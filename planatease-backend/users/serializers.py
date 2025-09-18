from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("email", "full_name", "password", "password2")

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        email = validated_data["email"].strip().lower()
        return User.objects.create_user(
            email=email,
            password=validated_data["password"],
            full_name=validated_data.get("full_name", "")
        )

class UserSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=False)

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "profile_picture", "home_location", "preferences")
        read_only_fields = ("id",)
        extra_kwargs = {
            "full_name": {"required": False, "allow_blank": True},
            "profile_picture": {"required": False, "allow_null": True, "allow_blank": True},
            "home_location": {"required": False, "allow_blank": True},
            "preferences": {"required": False},
        }

    def validate_email(self, value):
        email = value.strip().lower()
        qs = User.objects.filter(email__iexact=email)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return email

    def update(self, instance, validated_data):
        email = validated_data.get("email")
        if email is not None:
            validated_data["email"] = email.strip().lower()

        return super().update(instance, validated_data)

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    new_password2 = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password2"]:
            raise serializers.ValidationError({"new_password2": "Passwords do not match."})
        validate_password(attrs["new_password"])
        return attrs