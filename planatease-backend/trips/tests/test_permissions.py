from django.test import TestCase, RequestFactory
from trips.permissions import IsTripOwnerOrMemberReadOnly
from trips.tests.utils import create_trip, add_member, create_user

class PermissionTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.view = object()
        self.perm = IsTripOwnerOrMemberReadOnly()

    def test_owner_can_write(self):
        trip = create_trip()
        req = self.factory.post("/")
        req.user = trip.owner
        self.assertTrue(self.perm.has_object_permission(req, self.view, trip))

    def test_member_read_only(self):
        trip = create_trip()
        m = add_member(trip)
        req_get = self.factory.get("/")
        req_get.user = m.user
        self.assertTrue(self.perm.has_object_permission(req_get, self.view, trip))
        req_post = self.factory.post("/")
        req_post.user = m.user
        self.assertFalse(self.perm.has_object_permission(req_post, self.view, trip))

    def test_non_member_denied(self):
        trip = create_trip()
        stranger = create_user("x@example.com")
        req = self.factory.get("/")
        req.user = stranger
        self.assertFalse(self.perm.has_object_permission(req, self.view, trip))
