from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models import Q, F

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