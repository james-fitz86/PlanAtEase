from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch, MagicMock
from trips.tests.utils import auth_client, create_user, create_guest_trip, create_guest_item
from trips.models import GuestTrip
from rest_framework import status

class GuestTripFlowTests(TestCase):
    def test_guest_list_create_sets_header_and_expiry(self):
        c = auth_client()
        res = c.get(reverse("trips:guest-trip-list-create"))
        self.assertEqual(res.status_code, 200)
        gid = res.headers.get("X-Guest-Id")
        self.assertTrue(gid)
        payload = {
            "name":"G","start_date":"2024-01-01","end_date":"2024-01-02",
            "source":"google","place_id":"p","formatted_address":"A","city_name":"C",
            "country_code":"IE","lat":53.35,"lng":-6.26,"raw_place":{}
        }
        res2 = c.post(reverse("trips:guest-trip-list-create"), payload, format="json")
        self.assertEqual(res2.status_code, 201)
        self.assertEqual(res2.headers.get("X-Guest-Id"), gid)
        self.assertIn("expires_at", res2.data)

    def test_guest_detail_enforces_gid_and_expiration(self):
        c = auth_client()
        res = c.post(reverse("trips:guest-trip-list-create"), {
            "name":"G","start_date":"2024-01-01","end_date":"2024-01-02",
            "source":"google","place_id":"p","formatted_address":"A","city_name":"C",
            "country_code":"IE","lat":53.35,"lng":-6.26,"raw_place":{}
        }, format="json")
        gid = res.headers["X-Guest-Id"]
        trip_id = res.data["id"]
        c2 = auth_client()
        res2 = c2.get(reverse("trips:guest-trip-detail", args=[trip_id]))
        self.assertEqual(res2.status_code, 404)
        gt = GuestTrip.objects.get(pk=trip_id)
        gt.expires_at = timezone.now() - timedelta(seconds=1)
        gt.save(update_fields=["expires_at"])
        res3 = c.get(reverse("trips:guest-trip-detail", args=[trip_id]))
        self.assertEqual(res3.status_code, 404)

    def test_guest_items_list_create_and_headers(self):
        c = auth_client()

        res = c.post(reverse("trips:guest-trip-list-create"), {
            "name":"G","start_date":"2024-01-01","end_date":"2024-01-02",
            "source":"google","place_id":"p","formatted_address":"A","city_name":"C",
            "country_code":"IE","lat":53.35,"lng":-6.26,"raw_place":{}
        }, format="json")
        gid = res.headers["X-Guest-Id"]
        trip_id = res.data["id"]

        res_list = c.get(
            reverse("trips:guest-tripitem-list-create", args=[trip_id]),
            HTTP_X_GUEST_ID=gid
        )
        self.assertEqual(res_list.status_code, 200)
        self.assertEqual(res_list.headers.get("X-Guest-Id"), gid)

        res_create = c.post(
            reverse("trips:guest-tripitem-list-create", args=[trip_id]),
            {
                "item_type":"activity","date":"2024-01-01",
                "start_time":"09:00:00","end_time":"10:00:00",
                "title":"X","description":"",
                "place":{"place_id":"abc123","name":"Place","formatted_address":"Addr",
                        "geometry":{"location":{"lat":53.35,"lng":-6.26}}}
            },
            format="json",
            HTTP_X_GUEST_ID=gid
        )
        self.assertEqual(res_create.status_code, 201)
        self.assertEqual(res_create.headers.get("X-Guest-Id"), gid)

    @patch("trips.views.promote_guest_trips_to_user")
    def test_guest_transfer_authenticated_calls_service(self, mock_promote):
        mock_promote.return_value = {"promoted": 2}
        u = create_user("auth@example.com")
        c = auth_client(u)
        res = c.post(reverse("trips:guest-transfer"), HTTP_X_GUEST_ID="abc")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data["transferred"]), 2)
        self.assertEqual(res.headers.get("X-Guest-Id"), "abc")
        mock_promote.assert_called()

    def test_guest_item_detail_retrieve_patch_delete_sets_header(self):
        c = auth_client()

        res_trip = c.post(reverse("trips:guest-trip-list-create"), {
            "name":"G","start_date":"2024-01-01","end_date":"2024-01-02",
            "source":"google","place_id":"p","formatted_address":"A","city_name":"C",
            "country_code":"IE","lat":53.35,"lng":-6.26,"raw_place":{}
        }, format="json")
        gid = res_trip.headers["X-Guest-Id"]
        trip_id = res_trip.data["id"]

        res_item = c.post(
            reverse("trips:guest-tripitem-list-create", args=[trip_id]),
            {
                "item_type":"activity","date":"2024-01-01",
                "start_time":"09:00:00","end_time":"10:00:00",
                "title":"X","description":"",
                "place":{"place_id":"abc123","name":"Place","formatted_address":"Addr",
                        "geometry":{"location":{"lat":53.35,"lng":-6.26}}}
            },
            format="json",
            HTTP_X_GUEST_ID=gid
        )
        item_id = res_item.data["id"]

        url = reverse("trips:guest-tripitem-detail", args=[trip_id, item_id])

        r1 = c.get(url, HTTP_X_GUEST_ID=gid)
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r1.headers.get("X-Guest-Id"), gid)

        r2 = c.patch(url, {"title": "Y"}, format="json", HTTP_X_GUEST_ID=gid)
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.headers.get("X-Guest-Id"), gid)
        self.assertEqual(r2.data["title"], "Y")

        r3 = c.delete(url, HTTP_X_GUEST_ID=gid)
        self.assertEqual(r3.status_code, 204)
        self.assertEqual(r3.headers.get("X-Guest-Id"), gid)

    def test_guest_trip_detail_raises_404_if_expired(self):
        c = auth_client()
        res = c.post(reverse("trips:guest-trip-list-create"), {
            "name":"G","start_date":"2024-01-01","end_date":"2024-01-02",
            "source":"google","place_id":"p","formatted_address":"A","city_name":"C",
            "country_code":"IE","lat":53.35,"lng":-6.26,"raw_place":{}
        }, format="json")
        gid = res.headers["X-Guest-Id"]
        trip_id = res.data["id"]

        from trips.models import GuestTrip
        from django.utils import timezone
        gt = GuestTrip.objects.get(pk=trip_id)
        gt.expires_at = timezone.now() - timezone.timedelta(days=1)
        gt.save(update_fields=["expires_at"])

        url = reverse("trips:guest-trip-detail", args=[trip_id])
        res2 = c.get(url, HTTP_X_GUEST_ID=gid)
        self.assertEqual(res2.status_code, 404)