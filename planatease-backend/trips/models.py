from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models import Q, F
from django.core.exceptions import ValidationError
import uuid
from django.utils.text import slugify

# Create your models here.

class Trip(models.Model):
    class Source(models.TextChoices):
        GOOGLE = "google", "Google Places"
        MANUAL = "manual", "Manual"
        OSM    = "osm",    "OpenStreetMap"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="owned_trips")

    name = models.CharField(max_length=120, blank=True)
    start_date = models.DateField()
    end_date   = models.DateField()

    source = models.CharField(max_length=10, choices=Source.choices, default=Source.GOOGLE)
    place_id = models.CharField(max_length=255, blank=True, db_index=True)
    formatted_address = models.CharField(max_length=255, blank=True)
    city_name = models.CharField(max_length=120, blank=True)
    country_code = models.CharField(max_length=2, blank=True)

    lat = models.FloatField(null=True, blank=True,
        validators=[MinValueValidator(-90.0), MaxValueValidator(90.0)])
    lng = models.FloatField(null=True, blank=True,
        validators=[MinValueValidator(-180.0), MaxValueValidator(180.0)])

    raw_place = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="TripMember",
        related_name="trips_shared_with_me",
        blank=True,
    )

    uid = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Stable public identifier (will replace numeric id in URLs).",
    )

    slug = models.SlugField(
        max_length=160,
        null=True,
        blank=True,
        db_index=True,
        help_text="Human-friendly identifier for URLs (not yet enforced unique).",
    )

    class Meta:
        constraints = [
            models.CheckConstraint(check=Q(end_date__gte=F("start_date")), name="trip_end_on_or_after_start"),
            models.CheckConstraint(
                check=Q(source="google", place_id__gt="") | ~Q(source="google"),
                name="trip_google_requires_place_id",
            ),
            models.CheckConstraint(
                check=Q(source="manual", city_name__gt="", lat__isnull=False, lng__isnull=False) | ~Q(source="manual"),
                name="trip_manual_requires_min_fields",
            ),
        ]

    def __str__(self):
        label = self.name or self.city_name or self.formatted_address or "Trip"
        return f"{label} [{self.start_date} → {self.end_date}]"
    
    def _ensure_identifiers(self):
        if not self.uid:
            self.uid = uuid.uuid4()

        if not self.slug:
            base = self.name or self.city_name or self.formatted_address or "trip"
            s = slugify(base)[:150] or f"trip-{str(self.uid)[:8]}"

            candidate = s
            Model = self.__class__
            while Model.objects.filter(slug=candidate).exclude(pk=self.pk).exists():
                candidate = f"{s}-{uuid.uuid4().hex[:6]}"
                if len(candidate) > 160:
                    candidate = candidate[:160]
            self.slug = candidate

    def save(self, *args, **kwargs):
        self._ensure_identifiers()
        return super().save(*args, **kwargs)

class TripMember(models.Model):
    class Role(models.TextChoices):
        EDITOR = "editor", "Editor"
        VIEWER = "viewer", "Viewer"

    trip = models.ForeignKey(
        Trip,
        on_delete=models.CASCADE,
        related_name="members"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="trip_memberships"
    )
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.EDITOR)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("trip", "user")]

    def __str__(self):
        return f"{self.user} as {self.role} in {self.trip}"
    
class TripItem(models.Model):
    class Type(models.TextChoices):
        FLIGHT         = "flight", "Flight"
        ACCOMMODATION  = "accommodation", "Accommodation"
        RESTAURANT     = "restaurant", "Restaurant"
        TRANSPORT      = "transport", "Transport"
        ACTIVITY       = "activity", "Activity"
        SIGHTSEEING    = "sightseeing", "Sightseeing"
        OTHER          = "other", "Other"

    trip = models.ForeignKey(
        "Trip",
        on_delete=models.CASCADE,
        related_name="items"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="trip_items_created"
    )

    item_type = models.CharField(max_length=20, choices=Type.choices)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField(null=True, blank=True)

    place_id = models.CharField(
        max_length=255,
        db_index=True,
        help_text="Google Place ID"
    )
    place_name = models.CharField(
        max_length=200,
        help_text="Primary display name from Places (e.g., venue/hotel/airport)"
    )
    formatted_address = models.CharField(
        max_length=255,
        help_text="Formatted address from Places"
    )

    lat = models.FloatField(
        validators=[MinValueValidator(-90.0), MaxValueValidator(90.0)]
    )
    lng = models.FloatField(
        validators=[MinValueValidator(-180.0), MaxValueValidator(180.0)]
    )

    title = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)

    raw_place = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["date", "start_time", "item_type", "place_name"]
        indexes = [
            models.Index(fields=["trip", "date"]),
            models.Index(fields=["item_type"]),
            models.Index(fields=["place_id"]),
        ]

    def __str__(self):
        label = self.title or self.place_name
        return f"{self.get_item_type_display()}: {label} on {self.date} at {self.start_time}"

    def clean(self):
        if self.end_time and self.end_time <= self.start_time:
            raise ValidationError({"end_time": "End time must be after start time."})

        if self.trip_id and self.trip:
            if self.date < self.trip.start_date or self.date > self.trip.end_date:
                raise ValidationError({"date": "Item date must be within the trip start/end dates."})

        missing = []
        if not self.place_id:
            missing.append("place_id")
        if not self.place_name:
            missing.append("place_name")
        if not self.formatted_address:
            missing.append("formatted_address")
        if missing:
            raise ValidationError({f: "This field is required." for f in missing})
        
        
class GuestTrip(models.Model):
    class Source(models.TextChoices):
        GOOGLE = "google", "Google Places"
        MANUAL = "manual", "Manual"
        OSM    = "osm",    "OpenStreetMap"

    guest_id = models.CharField(max_length=64, db_index=True)

    name = models.CharField(max_length=120, blank=True)
    start_date = models.DateField()
    end_date   = models.DateField()

    source = models.CharField(max_length=10, choices=Source.choices, default=Source.GOOGLE)
    place_id = models.CharField(max_length=255, blank=True, db_index=True)
    formatted_address = models.CharField(max_length=255, blank=True)
    city_name = models.CharField(max_length=120, blank=True)
    country_code = models.CharField(max_length=2, blank=True)

    lat = models.FloatField(null=True, blank=True,
        validators=[MinValueValidator(-90.0), MaxValueValidator(90.0)])
    lng = models.FloatField(null=True, blank=True,
        validators=[MinValueValidator(-180.0), MaxValueValidator(180.0)])

    raw_place = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["guest_id", "expires_at"]),
        ]
        constraints = [
            models.CheckConstraint(check=Q(end_date__gte=F("start_date")), name="guest_trip_end_on_or_after_start"),
            models.CheckConstraint(
                check=Q(source="google", place_id__gt="") | ~Q(source="google"),
                name="guest_trip_google_requires_place_id",
            ),
            models.CheckConstraint(
                check=Q(source="manual", city_name__gt="", lat__isnull=False, lng__isnull=False) | ~Q(source="manual"),
                name="guest_trip_manual_requires_min_fields",
            ),
        ]

    def __str__(self):
        label = self.name or self.city_name or self.formatted_address or "GuestTrip"
        return f"{label} [{self.start_date} → {self.end_date}] (guest)"


class GuestTripItem(models.Model):
    class Type(models.TextChoices):
        FLIGHT         = "flight", "Flight"
        ACCOMMODATION  = "accommodation", "Accommodation"
        RESTAURANT     = "restaurant", "Restaurant"
        TRANSPORT      = "transport", "Transport"
        ACTIVITY       = "activity", "Activity"
        SIGHTSEEING    = "sightseeing", "Sightseeing"
        OTHER          = "other", "Other"

    guest_trip = models.ForeignKey(
        "GuestTrip",
        on_delete=models.CASCADE,
        related_name="items"
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="guest_trip_items_created"
    )

    item_type = models.CharField(max_length=20, choices=Type.choices)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField(null=True, blank=True)

    place_id = models.CharField(max_length=255, db_index=True, help_text="Google Place ID")
    place_name = models.CharField(max_length=200, help_text="Primary display name from Places")
    formatted_address = models.CharField(max_length=255, help_text="Formatted address from Places")

    lat = models.FloatField(validators=[MinValueValidator(-90.0), MaxValueValidator(90.0)])
    lng = models.FloatField(validators=[MinValueValidator(-180.0), MaxValueValidator(180.0)])

    title = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)

    raw_place = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["date", "start_time", "item_type", "place_name"]
        indexes = [
            models.Index(fields=["guest_trip", "date"]),
            models.Index(fields=["item_type"]),
            models.Index(fields=["place_id"]),
        ]

    def __str__(self):
        label = self.title or self.place_name
        return f"{self.get_item_type_display()}: {label} on {self.date} at {self.start_time} (guest)"

    def clean(self):
        if self.end_time and self.end_time <= self.start_time:
            raise ValidationError({"end_time": "End time must be after start time."})

        if self.guest_trip_id and self.guest_trip:
            if self.date < self.guest_trip.start_date or self.date > self.guest_trip.end_date:
                raise ValidationError({"date": "Item date must be within the trip start/end dates."})

        missing = []
        if not self.place_id:
            missing.append("place_id")
        if not self.place_name:
            missing.append("place_name")
        if not self.formatted_address:
            missing.append("formatted_address")
        if missing:
            raise ValidationError({f: "This field is required." for f in missing})
