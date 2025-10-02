from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from trips.models import Trip, TripMember, TripItem, GuestTrip, GuestTripItem
from datetime import date, time, timedelta
from django.utils import timezone

User = get_user_model()

def create_user(email="user@example.com", password="Passw0rd!23", **extra):
    defaults = dict(full_name="Test User", is_active=True)
    defaults.update(extra)
    return User.objects.create_user(email=email, password=password, **defaults)

def auth_client(user=None):
    c = APIClient()
    if user:
        c.force_authenticate(user)
    return c

def create_trip(owner=None, name="Trip", start=None, end=None, **extra):
    owner = owner or create_user("owner@example.com")
    start = start or date.today()
    end = end or (start + timedelta(days=2))
    defaults = dict(
        owner=owner, name=name, start_date=start, end_date=end,
        source="google", place_id="place_123", formatted_address="Addr",
        city_name="City", country_code="IE", lat=53.35, lng=-6.26, raw_place={}
    )
    defaults.update(extra)
    t = Trip.objects.create(**defaults)
    return t

def add_member(trip, user=None, role="editor"):
    user = user or create_user("member@example.com")
    return TripMember.objects.create(trip=trip, user=user, role=role)

def item_place_payload():
    return {
        "place_id": "abc123", "name": "Some Place", "formatted_address": "123 St",
        "geometry": {"location": {"lat": 53.35, "lng": -6.26}}
    }

def create_trip_item(trip, created_by=None, **extra):
    d = trip.start_date
    defaults = dict(
        trip=trip, created_by=created_by, item_type="activity",
        date=d, start_time=time(9, 0), end_time=time(10, 0),
        place_id="p1", place_name="Place", formatted_address="Addr",
        lat=53.35, lng=-6.26, title="T", description="", raw_place={}
    )
    defaults.update(extra)
    return TripItem.objects.create(**defaults)

def create_guest_trip(gid="gid1", **extra):
    now = timezone.now()
    start = now.date()
    defaults = dict(
        guest_id=gid,
        name="Guest",
        start_date=start,
        end_date=start + timedelta(days=1),
        source="google",
        place_id="gpid",
        formatted_address="GAddr",
        city_name="City",
        country_code="IE",
        lat=53.35,
        lng=-6.26,
        raw_place={},
        expires_at=now + timedelta(days=7),
    )
    defaults.update(extra)
    return GuestTrip.objects.create(**defaults)

def create_guest_item(guest_trip, **extra):
    d = guest_trip.start_date
    defaults = dict(
        guest_trip=guest_trip, created_by=None, item_type="activity",
        date=d, start_time=time(9, 0), end_time=time(10, 0),
        place_id="gp1", place_name="GPlace", formatted_address="GAddr",
        lat=53.35, lng=-6.26, title="GT", description="", raw_place={}
    )
    defaults.update(extra)
    return GuestTripItem.objects.create(**defaults)
