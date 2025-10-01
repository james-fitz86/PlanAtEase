from rest_framework import serializers
from .models import Trip, TripMember, TripItem, GuestTrip, GuestTripItem
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q

User = get_user_model()

class TripMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = TripMember
        fields = ["id", "user_id", "user_email", "role", "added_at"]
        read_only_fields = ["id", "user_id", "user_email", "added_at"]
    
    def update(self, instance, validated_data):
        role = validated_data.get("role", None)
        if role is not None:
            instance.role = role
            instance.save(update_fields=["role"])
        return instance


class TripSerializer(serializers.ModelSerializer):
    members = TripMemberSerializer(many=True, read_only=True)
    is_owner = serializers.SerializerMethodField(read_only=True)
    owner_id = serializers.IntegerField(source="owner.id", read_only=True)
    owner_email = serializers.EmailField(source="owner.email", read_only=True)

    class Meta:
        model = Trip
        read_only_fields = ("id", "owner", "created_at", "uid", "slug")
        fields = (
            "id", "uid", "slug",
            "owner", "name", "start_date", "end_date",
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

        old_start = instance.start_date
        old_end = instance.end_date

        with transaction.atomic():
            instance = super().update(instance, validated_data)

            new_start = instance.start_date
            new_end = instance.end_date
            if old_start != new_start or old_end != new_end:
                from .models import TripItem
                (
                    TripItem.objects
                    .filter(trip=instance)
                    .filter(Q(date__lt=new_start) | Q(date__gt=new_end))
                    .delete()
                )

        return instance

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
    
class TripItemSerializer(serializers.ModelSerializer):
    trip_id = serializers.IntegerField(source="trip.id", read_only=True)
    created_by_id = serializers.IntegerField(source="created_by.id", read_only=True)
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)
    item_type_label = serializers.CharField(source="get_item_type_display", read_only=True)

    class Meta:
        model = TripItem
        read_only_fields = [
            "id", "trip", "created_by", "created_at", "updated_at",
            "trip_id", "created_by_id", "created_by_email", "item_type_label"
        ]
        fields = [
            "id", "trip_id", "created_by_id", "created_by_email",
            "item_type", "item_type_label",
            "date", "start_time", "end_time",
            "place_id", "place_name", "formatted_address",
            "lat", "lng",
            "title", "description", "raw_place",
            "created_at", "updated_at",
        ]

    def validate(self, attrs):
        trip: Trip = self.context.get("trip")
        request = self.context.get("request")

        if trip and not attrs.get("trip"):
            attrs["trip"] = trip

        if trip and "date" in attrs:
            date = attrs["date"]
            if date < trip.start_date or date > trip.end_date:
                raise serializers.ValidationError({
                    "date": "Item date must be within trip start/end dates."
                })

        if attrs.get("end_time") and attrs["end_time"] <= attrs["start_time"]:
            raise serializers.ValidationError({
                "end_time": "End time must be after start time."
            })

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["created_by"] = request.user
        return super().create(validated_data)

class TripItemCreateSerializer(serializers.ModelSerializer):
   
    place = serializers.JSONField(write_only=True, help_text="Google Places object")
    item_type_label = serializers.CharField(source="get_item_type_display", read_only=True)

    class Meta:
        model = TripItem
        fields = [
            "id", "item_type", "item_type_label",
            "date", "start_time", "end_time",
            "title", "description",
            "place",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "item_type_label"]

    def validate(self, attrs):
        trip: Trip = self.context.get("trip")

        if trip and "date" in attrs:
            date = attrs["date"]
            if date < trip.start_date or date > trip.end_date:
                raise serializers.ValidationError({
                    "date": "Item date must be within trip start/end dates."
                })

        if attrs.get("end_time") and attrs["end_time"] <= attrs["start_time"]:
            raise serializers.ValidationError({
                "end_time": "End time must be after start time."
            })

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        trip: Trip = self.context["trip"]

        place = validated_data.pop("place", {})
        validated_data.update({
            "trip": trip,
            "created_by": request.user if request and request.user.is_authenticated else None,
            "place_id": place.get("place_id") or place.get("id", ""),
            "place_name": place.get("name", ""),
            "formatted_address": place.get("formatted_address", ""),
            "lat": place.get("geometry", {}).get("location", {}).get("lat"),
            "lng": place.get("geometry", {}).get("location", {}).get("lng"),
            "raw_place": place,
        })

        return TripItem.objects.create(**validated_data)
    


class GuestTripSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuestTrip
        read_only_fields = ("id", "created_at", "expires_at")
        fields = (
            "id",
            "name", "start_date", "end_date",
            "source", "place_id", "formatted_address",
            "city_name", "country_code", "lat", "lng", "raw_place",
            "created_at", "expires_at",
        )

    def update(self, instance, validated_data):
        old_start = instance.start_date
        old_end = instance.end_date
        with transaction.atomic():
            instance = super().update(instance, validated_data)
            new_start = instance.start_date
            new_end = instance.end_date
            if old_start != new_start or old_end != new_end:
                (GuestTripItem.objects
                 .filter(guest_trip=instance)
                 .filter(Q(date__lt=new_start) | Q(date__gt=new_end))
                 .delete())
        return instance


class GuestTripItemSerializer(serializers.ModelSerializer):
    guest_trip_id = serializers.IntegerField(source="guest_trip.id", read_only=True)
    created_by_id = serializers.IntegerField(source="created_by.id", read_only=True)
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)
    item_type_label = serializers.CharField(source="get_item_type_display", read_only=True)

    class Meta:
        model = GuestTripItem
        read_only_fields = [
            "id", "guest_trip", "created_by",
            "created_at", "updated_at",
            "guest_trip_id", "created_by_id", "created_by_email", "item_type_label",
        ]
        fields = [
            "id", "guest_trip_id", "created_by_id", "created_by_email",
            "item_type", "item_type_label",
            "date", "start_time", "end_time",
            "place_id", "place_name", "formatted_address",
            "lat", "lng",
            "title", "description", "raw_place",
            "created_at", "updated_at",
        ]

    def validate(self, attrs):
        guest_trip: GuestTrip = self.context.get("guest_trip")
        if guest_trip and not attrs.get("guest_trip"):
            attrs["guest_trip"] = guest_trip

        if guest_trip and "date" in attrs:
            date = attrs["date"]
            if date < guest_trip.start_date or date > guest_trip.end_date:
                raise serializers.ValidationError({
                    "date": "Item date must be within trip start/end dates."
                })

        if attrs.get("end_time") and attrs["end_time"] <= attrs["start_time"]:
            raise serializers.ValidationError({
                "end_time": "End time must be after start time."
            })

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["created_by"] = request.user
        return super().create(validated_data)


class GuestTripItemCreateSerializer(serializers.ModelSerializer):
    """
    Creation serializer that accepts a Google Places object as `place`
    (same pattern as TripItemCreateSerializer).
    """
    place = serializers.JSONField(write_only=True, help_text="Google Places object")
    item_type_label = serializers.CharField(source="get_item_type_display", read_only=True)

    class Meta:
        model = GuestTripItem
        fields = [
            "id", "item_type", "item_type_label",
            "date", "start_time", "end_time",
            "title", "description",
            "place",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "item_type_label"]

    def validate(self, attrs):
        guest_trip: GuestTrip = self.context.get("guest_trip")

        if guest_trip and "date" in attrs:
            date = attrs["date"]
            if date < guest_trip.start_date or date > guest_trip.end_date:
                raise serializers.ValidationError({
                    "date": "Item date must be within trip start/end dates."
                })

        if attrs.get("end_time") and attrs["end_time"] <= attrs["start_time"]:
            raise serializers.ValidationError({
                "end_time": "End time must be after start time."
            })

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        guest_trip: GuestTrip = self.context["guest_trip"]

        place = validated_data.pop("place", {}) or {}
        validated_data.update({
            "guest_trip": guest_trip,
            "created_by": request.user if request and request.user.is_authenticated else None,
            "place_id": place.get("place_id") or place.get("id", ""),
            "place_name": place.get("name", ""),
            "formatted_address": place.get("formatted_address", ""),
            "lat": place.get("geometry", {}).get("location", {}).get("lat"),
            "lng": place.get("geometry", {}).get("location", {}).get("lng"),
            "raw_place": place,
        })

        return GuestTripItem.objects.create(**validated_data)
