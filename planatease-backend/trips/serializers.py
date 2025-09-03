from rest_framework import serializers
from .models import Trip, TripMember


class TripMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = TripMember
        fields = ["id", "user_id", "user_email", "role", "added_at"]
        read_only_fields = ["id", "user_id", "user_email", "added_at"]


class TripSerializer(serializers.ModelSerializer):
    members = TripMemberSerializer(many=True, read_only=True)

    class Meta:
        model = Trip
        read_only_fields = ("id", "owner", "created_at")
        fields = (
            "id", "owner", "name", "start_date", "end_date",
            "source", "place_id", "formatted_address",
            "city_name", "country_code", "lat", "lng", "raw_place",
            "created_at", "members"
        )

    def create(self, validated_data):
        validated_data["owner"] = self.context["request"].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if instance.owner_id != self.context["request"].user.id:
            raise serializers.ValidationError("Only the owner can update trip details.")
        return super().update(instance, validated_data)