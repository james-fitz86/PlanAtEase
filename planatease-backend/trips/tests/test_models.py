from django.test import TestCase
from trips.tests.utils import create_user, create_trip, create_trip_item, create_guest_trip, create_guest_item, add_member
from trips.models import TripItem, GuestTripItem
from django.core.exceptions import ValidationError
from datetime import time, timedelta
from django.utils import timezone

class TripModelTests(TestCase):
    def test_trip_save_sets_uid_and_slug(self):
        t = create_trip()
        self.assertIsNotNone(t.uid)
        self.assertTrue(t.slug)
    
    def test_slug_collision_generates_unique_slug(self):
        o1 = create_user("owner1@example.com")
        o2 = create_user("owner2@example.com")
        t1 = create_trip(owner=o1, name="SameName")
        t2 = create_trip(owner=o2, name="SameName")
        self.assertNotEqual(t1.slug, t2.slug)
        self.assertTrue(t2.slug.startswith("samename"))
    
    def test_trip_str_uses_fallback_label(self):
        t = create_trip(name="")
        t.city_name = ""
        t.formatted_address = ""
        t.save()
        s = str(t)
        self.assertIn("[", s)
        self.assertIn("→", s)
        self.assertTrue(s.startswith("Trip "))

    def test_slug_fallback_when_base_empty_and_uid_set(self):
        t = create_trip(name="Trip")
        t.name = ""
        t.city_name = ""
        t.formatted_address = ""
        t.slug = None
        t.uid = None
        t.save()
        self.assertIsNotNone(t.uid)
        self.assertTrue(t.slug.startswith("trip"))

    def test_slug_truncated_to_160_chars(self):
        long_addr = "x" * 255
        t = create_trip(name="", city_name="", formatted_address=long_addr)
        self.assertTrue(t.slug.startswith("x"))
        self.assertLessEqual(len(t.slug), 150)

class TripItemModelTests(TestCase):
    def test_clean_validates_end_time_after_start(self):
        t = create_trip()
        it = create_trip_item(t, end_time=time(8, 0))
        with self.assertRaises(ValidationError):
            it.clean()

    def test_clean_validates_date_within_trip(self):
        t = create_trip()
        it = create_trip_item(t, date=t.end_date + timedelta(days=1))
        with self.assertRaises(ValidationError):
            it.clean()

    def test_clean_requires_place_fields(self):
        t = create_trip()
        it = create_trip_item(t, place_id="", place_name="", formatted_address="")
        with self.assertRaises(ValidationError):
            it.clean()

class GuestTripItemModelTests(TestCase):
    def test_guest_item_validations_parallel(self):
        gt = create_guest_trip()
        gi = create_guest_item(gt, end_time=time(8, 0))
        with self.assertRaises(ValidationError):
            gi.clean()
        gi2 = create_guest_item(gt, date=gt.end_date + timedelta(days=1))
        with self.assertRaises(ValidationError):
            gi2.clean()

class TripMemberAndItemStrTests(TestCase):
    def test_tripmember_str(self):
        t = create_trip()
        m = add_member(t, role="viewer")
        s = str(m)
        self.assertIn("viewer", s)
        self.assertIn(str(t), s)

    def test_tripitem_str(self):
        t = create_trip()
        it = create_trip_item(t, title="Museum")
        s = str(it)
        self.assertIn("Activity", s)
        self.assertIn("Museum", s)
        self.assertIn(str(it.date), s)
        self.assertIn(str(it.start_time), s)

    def test_guesttrip_str(self):
        gt = create_guest_trip()
        gt.name = ""
        gt.city_name = ""
        gt.formatted_address = ""
        gt.save()
        s = str(gt)
        self.assertTrue(s.startswith("GuestTrip "))
        self.assertIn(" (guest)", s)

    def test_guesttripitem_str(self):
        gt = create_guest_trip()
        gi = create_guest_item(gt, title="Lunch")
        s = str(gi)
        self.assertIn("Activity", s)
        self.assertIn("Lunch", s)
        self.assertIn(str(gi.date), s)
        self.assertIn(str(gi.start_time), s)
        self.assertIn(" (guest)", s)

class GuestTripItemCleanTests(TestCase):
    def test_missing_place_fields_raise_validation_error(self):
        gt = create_guest_trip()
        gi = GuestTripItem(
            guest_trip=gt,
            item_type="activity",
            date=gt.start_date,
            start_time=time(9, 0),
            end_time=time(10, 0),
            place_id="",
            place_name="",
            formatted_address="",
            lat=53.35, lng=-6.26,
            title="", description="",
        )
        with self.assertRaises(ValidationError) as cm:
            gi.clean()
        err = cm.exception
        self.assertIn("place_id", err.message_dict)
        self.assertIn("place_name", err.message_dict)
        self.assertIn("formatted_address", err.message_dict)
