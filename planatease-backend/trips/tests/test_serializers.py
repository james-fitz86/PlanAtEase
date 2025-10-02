from django.test import TestCase
from django.utils import timezone
from datetime import date, time, timedelta
from trips.tests.utils import (
    create_trip, add_member, create_user, create_trip_item,
    create_guest_trip, create_guest_item, item_place_payload
)
from trips.serializers import (
    TripSerializer, TripMemberCreateSerializer, TripItemSerializer, TripItemCreateSerializer,
    GuestTripSerializer, GuestTripItemSerializer, GuestTripItemCreateSerializer
)
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIRequestFactory

factory = APIRequestFactory()

class TripSerializerTests(TestCase):
    def test_create_sets_owner_from_request(self):
        u = create_user("own@example.com")
        req = factory.post("/")
        req.user = u
        ser = TripSerializer(data={
            "name":"T","start_date":date.today(),"end_date":date.today()+timedelta(days=1),
            "source":"google","place_id":"p","formatted_address":"A","city_name":"C","country_code":"IE",
            "lat":53.35,"lng":-6.26,"raw_place":{}
        }, context={"request": req})
        self.assertTrue(ser.is_valid(), ser.errors)
        t = ser.save()
        self.assertEqual(t.owner, u)

    def test_update_only_owner_and_prunes_items_out_of_range(self):
        t = create_trip()
        it1 = create_trip_item(t, date=t.start_date)
        it2 = create_trip_item(t, date=t.end_date)
        req = factory.patch("/")
        req.user = t.owner
        ser = TripSerializer(instance=t, data={"start_date": t.start_date+timedelta(days=1)}, partial=True, context={"request": req})
        self.assertTrue(ser.is_valid(), ser.errors)
        ser.save()
        self.assertFalse(t.items.filter(pk=it1.pk).exists())
        self.assertTrue(t.items.filter(pk=it2.pk).exists())

class TripMemberCreateSerializerTests(TestCase):
    def test_cannot_add_owner_or_duplicate(self):
        t = create_trip()
        req = factory.post("/")
        req.user = t.owner
        ser = TripMemberCreateSerializer(data={"email": t.owner.email, "role": "editor"}, context={"request": req, "trip": t})
        with self.assertRaises(ValidationError):
            ser.is_valid(raise_exception=True)
        m = add_member(t)
        ser2 = TripMemberCreateSerializer(data={"email": m.user.email, "role":"viewer"}, context={"request": req, "trip": t})
        with self.assertRaises(ValidationError):
            ser2.is_valid(raise_exception=True)

class TripItemSerializerTests(TestCase):
    def test_date_and_time_validation(self):
        t = create_trip()
        req = factory.post("/")
        req.user = t.owner
        ser = TripItemSerializer(data={
            "item_type":"activity",
            "date": t.start_date - timedelta(days=1),
            "start_time": time(9,0),
            "end_time": time(8,0),
            "place_id": "p","place_name":"P","formatted_address":"A",
            "lat":53.3,"lng":-6.2,"title":"","description":"","raw_place":{}
        }, context={"request": req, "trip": t})
        self.assertFalse(ser.is_valid())
        self.assertIn("date", ser.errors)
        ser2 = TripItemSerializer(data={
            "item_type":"activity",
            "date": t.start_date,
            "start_time": time(9,0),
            "end_time": time(8,0),
            "place_id": "p","place_name":"P","formatted_address":"A",
            "lat":53.3,"lng":-6.2,"title":"","description":"","raw_place":{}
        }, context={"request": req, "trip": t})
        self.assertFalse(ser2.is_valid())
        self.assertIn("end_time", ser2.errors)

    def test_create_sets_created_by(self):
        t = create_trip()
        req = factory.post("/")
        req.user = t.owner
        ser = TripItemSerializer(data={
            "item_type":"activity",
            "date": t.start_date,
            "start_time": time(9,0),
            "end_time": time(10,0),
            "place_id": "p","place_name":"P","formatted_address":"A",
            "lat":53.3,"lng":-6.2,"title":"","description":"","raw_place":{}
        }, context={"request": req, "trip": t})
        self.assertTrue(ser.is_valid(), ser.errors)
        obj = ser.save()
        self.assertEqual(obj.created_by, t.owner)

    def test_auto_attach_trip_if_missing(self):
        t = create_trip()
        req = factory.post("/")
        req.user = t.owner
        data = {
            "item_type": "activity",
            "date": t.start_date,
            "start_time": time(9,0),
            "end_time": time(10,0),
            "place_id": "p","place_name":"P","formatted_address":"A",
            "lat":53.3,"lng":-6.2,"title":"","description":"","raw_place":{}
        }
        ser = TripItemSerializer(data=data, context={"request": req, "trip": t})
        self.assertTrue(ser.is_valid(), ser.errors)
        obj = ser.save()
        self.assertEqual(obj.trip, t)

class TripItemCreateSerializerTests(TestCase):
    def test_create_parses_place_payload(self):
        t = create_trip()
        req = factory.post("/")
        req.user = t.owner
        ser = TripItemCreateSerializer(data={
            "item_type":"activity",
            "date": t.start_date,
            "start_time": time(9,0),
            "end_time": time(10,0),
            "title":"X","description":"",
            "place": item_place_payload()
        }, context={"request": req, "trip": t})
        self.assertTrue(ser.is_valid(), ser.errors)
        obj = ser.save()
        self.assertEqual(obj.place_id, "abc123")
        self.assertEqual(obj.place_name, "Some Place")

class GuestTripSerializerTests(TestCase):
    def test_update_prunes_out_of_range_items(self):
        gt = create_guest_trip()
        gi_keep = create_guest_item(gt, date=gt.end_date)
        gi_del = create_guest_item(gt, date=gt.start_date - timedelta(days=1))
        ser = GuestTripSerializer(instance=gt, data={"start_date": gt.start_date + timedelta(days=1)}, partial=True)
        self.assertTrue(ser.is_valid(), ser.errors)
        ser.save()
        self.assertFalse(gt.items.filter(pk=gi_del.pk).exists())
        self.assertTrue(gt.items.filter(pk=gi_keep.pk).exists())

class GuestTripItemSerializerTests(TestCase):
    def test_guest_item_validates_and_sets_guest_trip(self):
        gt = create_guest_trip()
        ser = GuestTripItemSerializer(data={
            "item_type":"activity","date":gt.start_date,
            "start_time":time(9,0),"end_time":time(10,0),
            "place_id":"p","place_name":"P","formatted_address":"A",
            "lat":53.3,"lng":-6.2,"title":"","description":"","raw_place":{}
        }, context={"guest_trip": gt})
        self.assertTrue(ser.is_valid(), ser.errors)
        obj = ser.save()
        self.assertEqual(obj.guest_trip_id, gt.id)
    
    def test_auto_attach_guest_trip_if_missing(self):
        gt = create_guest_trip()
        data = {
            "item_type":"activity","date":gt.start_date,
            "start_time":time(9,0),"end_time":time(10,0),
            "place_id":"p","place_name":"P","formatted_address":"A",
            "lat":53.3,"lng":-6.2,"title":"","description":"","raw_place":{}
        }
        ser = GuestTripItemSerializer(data=data, context={"guest_trip": gt})
        self.assertTrue(ser.is_valid(), ser.errors)
        obj = ser.save()
        self.assertEqual(obj.guest_trip, gt)

class GuestTripItemCreateSerializerTests(TestCase):
    def test_guest_create_parses_place_payload(self):
        gt = create_guest_trip()
        ser = GuestTripItemCreateSerializer(data={
            "item_type":"activity","date":gt.start_date,
            "start_time":time(9,0),"end_time":time(10,0),
            "title":"X","description":"",
            "place": item_place_payload()
        }, context={"guest_trip": gt, "request": None})
        self.assertTrue(ser.is_valid(), ser.errors)
        obj = ser.save()
        self.assertEqual(obj.place_id, "abc123")
        self.assertEqual(obj.place_name, "Some Place")
