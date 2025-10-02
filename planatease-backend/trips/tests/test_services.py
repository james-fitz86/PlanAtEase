from django.test import TestCase, RequestFactory
from trips.services import promote_guest_trips_to_user
from trips.tests.utils import create_user, create_guest_trip, create_guest_item
from trips.models import Trip, TripItem
from django.utils import timezone
from datetime import timedelta

class PromoteServiceTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()

    def test_no_gid_or_no_trips(self):
        req = self.factory.get("/")
        req.session = {}
        u = create_user("u@example.com")
        self.assertEqual(promote_guest_trips_to_user(req, u), {"found": 0, "promoted": 0})

    def test_promotes_trips_and_items_and_deletes_guest(self):
        u = create_user("u@example.com")
        req = self.factory.get("/")
        req.session = {"guest_id": "gid1"}
        gt = create_guest_trip(gid="gid1")
        gi1 = create_guest_item(gt)
        gi2 = create_guest_item(gt)
        summary = promote_guest_trips_to_user(req, u)
        self.assertEqual(summary["found"], 1)
        self.assertEqual(summary["promoted"], 1)
        self.assertEqual(Trip.objects.filter(owner=u).count(), 1)
        t = Trip.objects.get(owner=u)
        self.assertEqual(TripItem.objects.filter(trip=t).count(), 2)
        self.assertFalse(gt.__class__.objects.filter(pk=gt.pk).exists())

    def test_gid_set_but_no_active_trips(self):
        u = create_user("u2@example.com")
        req = self.factory.get("/")
        req.session = {"guest_id": "gidX"}

        past_expiry = timezone.now() - timedelta(seconds=1)
        create_guest_trip(gid="gidX", expires_at=past_expiry)

        summary = promote_guest_trips_to_user(req, u)
        self.assertEqual(summary, {"found": 0, "promoted": 0})
