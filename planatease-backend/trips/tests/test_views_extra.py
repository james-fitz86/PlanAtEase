from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.exceptions import NotFound

from trips.views import (
    TripMemberListCreateView,
    TripMemberDetailView,
    TripItemListCreateView,
    TripItemRetrieveUpdateDestroyView,
    GuestTripRetrieveUpdateDestroyView,
)
from trips.tests.utils import (
    create_user,
    create_trip,
    add_member,
    create_trip_item,
    create_guest_trip,
)
from trips.models import TripMember


class TripMemberViewsCoverageTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_member_list_dispatch_by_uid_and_slug_and_not_found(self):
        trip = create_trip()
        owner = trip.owner
        view = TripMemberListCreateView.as_view()

        req1 = self.factory.get("/members")
        force_authenticate(req1, owner)
        res1 = view(req1, uid=str(trip.uid))
        self.assertEqual(res1.status_code, 200)

        req2 = self.factory.get("/members")
        force_authenticate(req2, owner)
        res2 = view(req2, slug=trip.slug)
        self.assertEqual(res2.status_code, 200)

        req3 = self.factory.get("/members")
        force_authenticate(req3, owner)
        with self.assertRaises(NotFound):
            view(req3, uid="00000000-0000-0000-0000-000000000000")

    def test_member_list_requires_access(self):
        trip = create_trip()
        other = create_user("outsider@example.com")
        view = TripMemberListCreateView.as_view()

        req = self.factory.get("/members")
        force_authenticate(req, other)
        res = view(req, uid=str(trip.uid))
        self.assertEqual(res.status_code, 404)

    def test_member_detail_dispatch_uid_slug_me_invalid_id_and_permissions(self):
        trip = create_trip()
        owner = trip.owner
        member_user = create_user("member1@example.com")
        member = add_member(trip, user=member_user, role="editor")
        view = TripMemberDetailView.as_view()

        r1 = self.factory.get("/members/detail")
        force_authenticate(r1, member_user)
        a1 = view(r1, uid=str(trip.uid), user_id=member.user.id)
        self.assertEqual(a1.status_code, 200)

        r2 = self.factory.get("/members/detail")
        force_authenticate(r2, member_user)
        a2 = view(r2, slug=trip.slug, user_id=member.user.id)
        self.assertEqual(a2.status_code, 200)

        r3 = self.factory.get("/members/detail")
        force_authenticate(r3, member_user)
        with self.assertRaises(NotFound):
            view(r3, uid="00000000-0000-0000-0000-000000000000", user_id=member.user.id)

        r4 = self.factory.get("/members/detail")
        force_authenticate(r4, member_user)
        a4 = view(r4, uid=str(trip.uid), user_id="me")
        self.assertEqual(a4.status_code, 200)

        r5 = self.factory.get("/members/detail")
        force_authenticate(r5, member_user)
        a5 = view(r5, uid=str(trip.uid), user_id="not-an-int")
        self.assertEqual(a5.status_code, 404)

        r6 = self.factory.patch("/members/detail", {"role": "viewer"}, format="json")
        force_authenticate(r6, member_user)
        a6 = view(r6, uid=str(trip.uid), user_id=member.user.id)
        self.assertEqual(a6.status_code, 403)

        owner_member = TripMember.objects.create(trip=trip, user=owner, role="editor")
        r7 = self.factory.patch("/members/detail", {"role": "viewer"}, format="json")
        force_authenticate(r7, owner)
        a7 = view(r7, uid=str(trip.uid), user_id=owner_member.user.id)
        self.assertEqual(a7.status_code, 403)

        r8 = self.factory.delete("/members/detail")
        force_authenticate(r8, owner)
        a8 = view(r8, uid=str(trip.uid), user_id=owner_member.user.id)
        self.assertEqual(a8.status_code, 403)

        r9 = self.factory.delete("/members/detail")
        force_authenticate(r9, member_user)
        a9 = view(r9, uid=str(trip.uid), user_id=owner_member.user.id)
        self.assertEqual(a9.status_code, 403)


class TripItemViewsCoverageTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_item_list_dispatch_not_found_and_permission(self):
        trip = create_trip()
        owner = trip.owner
        stranger = create_user("stranger@example.com")
        list_view = TripItemListCreateView.as_view()

        r1 = self.factory.get("/items")
        force_authenticate(r1, owner)
        a1 = list_view(r1, uid=str(trip.uid))
        self.assertEqual(a1.status_code, 200)

        r2 = self.factory.get("/items")
        force_authenticate(r2, owner)
        with self.assertRaises(NotFound):
            list_view(r2, uid="00000000-0000-0000-0000-000000000000")

        r3 = self.factory.get("/items")
        force_authenticate(r3, stranger)
        a3 = list_view(r3, uid=str(trip.uid))
        self.assertEqual(a3.status_code, 404)

    def test_item_detail_dispatch_not_found_and_permission_denied(self):
        trip = create_trip()
        owner = trip.owner
        stranger = create_user("nope@example.com")
        item = create_trip_item(trip, created_by=owner)
        view = TripItemRetrieveUpdateDestroyView.as_view()

        r1 = self.factory.get("/items/detail")
        force_authenticate(r1, owner)
        with self.assertRaises(NotFound):
            view(r1, uid="00000000-0000-0000-0000-000000000000", item_id=item.id)

        r2 = self.factory.get("/items/detail")
        force_authenticate(r2, stranger)
        a2 = view(r2, uid=str(trip.uid), item_id=item.id)
        self.assertEqual(a2.status_code, 403)

        r3 = self.factory.patch("/items/detail", {"title": "X"}, format="json")
        force_authenticate(r3, stranger)
        a3 = view(r3, uid=str(trip.uid), item_id=item.id)
        self.assertEqual(a3.status_code, 403)

        r4 = self.factory.delete("/items/detail")
        force_authenticate(r4, stranger)
        a4 = view(r4, uid=str(trip.uid), item_id=item.id)
        self.assertEqual(a4.status_code, 403)


class GuestTripViewsCoverageTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_guest_trip_retrieve_patch_delete_adds_header_and_checks_owner(self):
        gt = create_guest_trip(gid="gid-xyz")
        view = GuestTripRetrieveUpdateDestroyView.as_view()

        r1 = self.factory.get("/guest/trip")
        r1.META["HTTP_X_GUEST_ID"] = "gid-xyz"
        a1 = view(r1, guest_trip_id=gt.id)
        self.assertEqual(a1.status_code, 200)
        self.assertEqual(a1["X-Guest-Id"], "gid-xyz")

        r2 = self.factory.patch("/guest/trip", {"name": "Renamed"}, format="json")
        r2.META["HTTP_X_GUEST_ID"] = "gid-xyz"
        a2 = view(r2, guest_trip_id=gt.id)
        self.assertEqual(a2.status_code, 200)
        self.assertEqual(a2["X-Guest-Id"], "gid-xyz")

        r3 = self.factory.delete("/guest/trip")
        r3.META["HTTP_X_GUEST_ID"] = "gid-xyz"
        a3 = view(r3, guest_trip_id=gt.id)
        self.assertEqual(a3.status_code, 204)
        self.assertEqual(a3["X-Guest-Id"], "gid-xyz")

    def test_guest_trip_expired_is_not_found(self):
        expired = create_guest_trip(gid="gid-exp", expires_at=timezone.now() - timedelta(minutes=1))
        view = GuestTripRetrieveUpdateDestroyView.as_view()
        r = self.factory.get("/guest/trip")
        r.META["HTTP_X_GUEST_ID"] = "gid-exp"
        a = view(r, guest_trip_id=expired.id)
        self.assertEqual(a.status_code, 404)

