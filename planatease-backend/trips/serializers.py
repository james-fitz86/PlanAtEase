from rest_framework import serializers
from .models import Trip, TripMember
from django.contrib.auth import get_user_model

User = get_user_model()

class TripMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = TripMember
        fields = ["id", "user_id", "user_email", "role", "added_at"]
        read_only_fields = ["id", "user_id", "user_email", "added_at"]


class TripSerializer(serializers.ModelSerializer):
    members = TripMemberSerializer(many=True, read_only=True)
    is_owner = serializers.SerializerMethodField(read_only=True)
    owner_id = serializers.IntegerField(source="owner.id", read_only=True)
    owner_email = serializers.EmailField(source="owner.email", read_only=True)


    class Meta:
        model = Trip
        read_only_fields = ("id", "owner", "created_at")
        fields = (
            "id", "owner", "name", "start_date", "end_date",
            "source", "place_id", "formatted_address",
            "city_name", "country_code", "lat", "lng", "raw_place",
            "created_at", "members", "is_owner", "owner_id", "owner_email",
        )

    def create(self, validated_data):
        validated_data["owner"] = self.context["request"].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if instance.owner_id != self.context["request"].user.id:
            raise serializers.ValidationError("Only the owner can update trip details.")
        return super().update(instance, validated_data)
    
    def get_is_owner(self, obj):
        request = self.context.get("request")
        return bool(request and request.user.is_authenticated and obj.owner_id == request.user.id)
    
class TripMemberCreateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(write_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_full_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = TripMember
        fields = ["id", "email", "role", "user_email", "user_full_name"]

    def validate(self, attrs):
        request = self.context["request"]
        trip: Trip = self.context["trip"]
        raw_email = attrs.pop("email").strip().lower()

        try:
            user = User.objects.get(email__iexact=raw_email)
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "No user with that email."})

        if user == trip.owner:
            raise serializers.ValidationError({"email": "Owner is already part of this trip."})

        if TripMember.objects.filter(trip=trip, user=user).exists():
            raise serializers.ValidationError({"email": "This user is already a member."})

        attrs["user"] = user
        attrs["trip"] = trip
        return attrs

    def create(self, validated_data):
        return TripMember.objects.create(**validated_data)