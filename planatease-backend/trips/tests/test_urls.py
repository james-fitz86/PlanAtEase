from django.test import SimpleTestCase
from django.urls import reverse, resolve
from trips import views

class TripsUrlsResolveTests(SimpleTestCase):
    def test_named_routes_exist(self):
        self.assertEqual(resolve(reverse("trips:trip-list-create")).func.view_class, views.TripListCreateView)
        self.assertEqual(resolve(reverse("trips:guest-trip-list-create")).func.view_class, views.GuestTripListCreateView)
        self.assertEqual(resolve(reverse("trips:guest-transfer")).func.view_class, views.GuestTripTransferView)
