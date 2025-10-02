from django.test import TestCase
from django.urls import reverse, NoReverseMatch
from datetime import timedelta, time
from trips.tests.utils import (
    create_user, auth_client, create_trip, add_member, create_trip_item
)
from trips.models import TripMember, TripItem
from rest_framework import status

class TripCRUDTests(TestCase):
    def test_list_shows_owned_and_member_trips(self):
        owner = create_user("o@example.com")
        member = create_user("m@example.com")
        t1 = create_trip(owner=owner, name="A")
        t2 = create_trip(owner=owner, name="B")
        add_member(t2, user=member)
        c = auth_client(member)
        res = c.get(reverse("trips:trip-list-create"))
        self.assertEqual(res.status_code, 200)
        names = [x["name"] for x in res.data]
        self.assertIn("B", names)
        self.assertNotIn("A", names)

    def test_create_trip_authenticated(self):
        u = create_user("u@example.com")
        c = auth_client(u)
        res = c.post(reverse("trips:trip-list-create"), data={
            "name":"New","start_date":"2024-01-01","end_date":"2024-01-03",
            "source":"google","place_id":"p","formatted_address":"A","city_name":"C",
            "country_code":"IE","lat":53.35,"lng":-6.26,"raw_place":{}
        }, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["owner_email"], u.email)

class TripRetrieveRoutingTests(TestCase):
    def test_retrieve_by_uid_slug_pk_and_access_rules(self):
        owner = create_user("o@example.com")
        other = create_user("x@example.com")
        t = create_trip(owner=owner, name="X")
        c_owner = auth_client(owner)
        c_other = auth_client(other)
        res = c_owner.get(reverse("trips:trip-detail", args=[t.id]))
        self.assertEqual(res.status_code, 200)
        res2 = c_other.get(reverse("trips:trip-detail", args=[t.id]))
        self.assertEqual(res2.status_code, 404)
        res3 = c_owner.get(reverse("trips:trip-detail-by-uid", args=[t.uid]))
        self.assertEqual(res3.status_code, 200)
        res4 = c_owner.get(reverse("trips:trip-detail-by-slug", kwargs={"slug": t.slug}))
        self.assertEqual(res4.status_code, 200)

    def test_update_only_owner(self):
        owner = create_user("o@example.com")
        member = create_user("m@example.com")
        t = create_trip(owner=owner, name="X")
        add_member(t, user=member, role="editor")
        c_member = auth_client(member)
        url = reverse("trips:trip-detail", args=[t.id])
        res = c_member.patch(url, {"name":"Nope"}, format="json")
        self.assertEqual(res.status_code, 400)
    
    def test_get_object_returns_not_found_for_missing_trip(self):
        owner = create_user("missing@example.com")
        c = auth_client(owner)
        url = reverse("trips:trip-detail", args=[99999])
        res = c.get(url)
        self.assertEqual(res.status_code, 404)

class TripMemberViewsTests(TestCase):
    def test_list_and_add_member_owner_only_add(self):
        owner = create_user("o@example.com")
        to_add = create_user("new@example.com")
        t = create_trip(owner=owner)
        add_member(t)
        url = reverse("trips:tripmember-list-create", args=[t.id])

        c_owner = auth_client(owner)
        res_list = c_owner.get(url)
        self.assertEqual(res_list.status_code, 200)
        self.assertGreaterEqual(len(res_list.data), 1)

        res_add = c_owner.post(url, {"email": to_add.email, "role": "viewer"}, format="json")
        self.assertEqual(res_add.status_code, 201)

        non_owner = create_user("x@example.com")
        other_to_add = create_user("other@example.com")
        c_non = auth_client(non_owner)
        res_denied = c_non.post(url, {"email": other_to_add.email, "role": "viewer"}, format="json")
        self.assertEqual(res_denied.status_code, 403)

    def test_member_detail_role_change_and_delete_rules(self):
        owner = create_user("o@example.com")
        t = create_trip(owner=owner)
        m = add_member(t, role="viewer")
        url = reverse("trips:tripmember-detail", args=[t.id, m.user_id])

        c_owner = auth_client(owner)
        res = c_owner.patch(url, {"role": "editor"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["role"], "editor")

        url_owner = reverse("trips:tripmember-detail", args=[t.id, owner.id])
        res2 = c_owner.patch(url_owner, {"role": "viewer"}, format="json")
        self.assertEqual(res2.status_code, 404)

        c_member = auth_client(m.user)
        res_self = c_member.delete(url)
        self.assertEqual(res_self.status_code, 204)

        url_owner = reverse("trips:tripmember-detail", args=[t.id, owner.id])
        res_owner_del = c_owner.delete(url_owner)
        self.assertEqual(res_owner_del.status_code, 404)
    
    def test_member_detail_invalid_member_id_returns_404(self):
        owner = create_user("owner3@example.com")
        t = create_trip(owner=owner)
        c_owner = auth_client(owner)

        with self.assertRaises(NoReverseMatch):
            reverse("trips:tripmember-detail", args=[t.id, "not-an-int"])


class TripItemViewsTests(TestCase):
    def test_list_create_and_permissions(self):
        owner = create_user("o@example.com")
        editor = create_user("e@example.com")
        viewer = create_user("v@example.com")
        t = create_trip(owner=owner)
        add_member(t, user=editor, role="editor")
        add_member(t, user=viewer, role="viewer")
        c_view = auth_client(viewer)
        res_list = c_view.get(reverse("trips:tripitem-list-create", args=[t.id]))
        self.assertEqual(res_list.status_code, 200)
        c_edit = auth_client(editor)
        url = reverse("trips:tripitem-list-create", args=[t.id])
        res_create = c_edit.post(url, {
            "item_type":"activity","date":str(t.start_date),
            "start_time":"09:00:00","end_time":"10:00:00",
            "title":"X","description":"",
            "place":{"place_id":"abc123","name":"Place","formatted_address":"Addr",
                     "geometry":{"location":{"lat":53.35,"lng":-6.26}}}
        }, format="json")
        self.assertEqual(res_create.status_code, 201)
        res_denied = c_view.post(url, {
            "item_type":"activity","date":str(t.start_date),
            "start_time":"09:00:00","end_time":"10:00:00",
            "title":"X","description":"",
            "place":{"place_id":"abc123","name":"Place","formatted_address":"Addr",
                     "geometry":{"location":{"lat":53.35,"lng":-6.26}}}
        }, format="json")
        self.assertEqual(res_denied.status_code, 403)

    def test_retrieve_update_delete_permissions(self):
        owner = create_user("o@example.com")
        editor = create_user("e@example.com")
        viewer = create_user("v@example.com")
        t = create_trip(owner=owner)
        add_member(t, user=editor, role="editor")
        add_member(t, user=viewer, role="viewer")
        it = create_trip_item(t)
        url = reverse("trips:tripitem-detail", args=[t.id, it.id])
        c_view = auth_client(viewer)
        self.assertEqual(c_view.get(url).status_code, 200)
        self.assertEqual(c_view.patch(url, {"title":"no"}, format="json").status_code, 403)
        self.assertEqual(c_view.delete(url).status_code, 403)
        c_edit = auth_client(editor)
        self.assertEqual(c_edit.patch(url, {"title":"yes"}, format="json").status_code, 200)
        self.assertEqual(c_edit.delete(url).status_code, 204)

    def test_viewer_cannot_update_or_delete_item(self):
        owner = create_user("o2@example.com")
        viewer = create_user("v2@example.com")
        t = create_trip(owner=owner)
        add_member(t, user=viewer, role="viewer")
        it = create_trip_item(t)

        url = reverse("trips:tripitem-detail", args=[t.id, it.id])
        c_view = auth_client(viewer)

        res_update = c_view.patch(url, {"title": "no"}, format="json")
        self.assertEqual(res_update.status_code, 403)

        res_delete = c_view.delete(url)
        self.assertEqual(res_delete.status_code, 403)

    def test_non_member_cannot_list_trip_items(self):
        owner = create_user("owner_nm@example.com")
        stranger = create_user("stranger_nm@example.com")
        t = create_trip(owner=owner)
        create_trip_item(t)

        c_stranger = auth_client(stranger)
        url = reverse("trips:tripitem-list-create", args=[t.id])
        res = c_stranger.get(url)
        self.assertEqual(res.status_code, 404)