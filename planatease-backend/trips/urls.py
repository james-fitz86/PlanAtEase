from django.urls import path, re_path
from django.views.decorators.csrf import csrf_exempt
from .views import (
    TripListCreateView, TripRetrieveUpdateDestroyView,
    TripMemberListCreateView, TripMemberDetailView,
    TripItemListCreateView, TripItemRetrieveUpdateDestroyView,
    GuestTripListCreateView, GuestTripRetrieveUpdateDestroyView,
    GuestTripItemListCreateView, GuestTripItemRetrieveUpdateDestroyView,
    GuestTripTransferView,
)

app_name = "trips"

urlpatterns = [
    path("guest/transfer/", GuestTripTransferView.as_view(), name="guest-transfer"),
    path("guest/trips/", GuestTripListCreateView.as_view(), name="guest-trip-list-create"),
    path("guest/trips/<int:guest_trip_id>/", GuestTripRetrieveUpdateDestroyView.as_view(), name="guest-trip-detail"),
    path("guest/trips/<int:guest_trip_id>/items/", GuestTripItemListCreateView.as_view(), name="guest-tripitem-list-create"),
    path("guest/trips/<int:guest_trip_id>/items/<int:item_id>/", GuestTripItemRetrieveUpdateDestroyView.as_view(), name="guest-tripitem-detail"),
    path("", TripListCreateView.as_view(), name="trip-list-create"),

    path("<uuid:uid>/", TripRetrieveUpdateDestroyView.as_view(), name="trip-detail-by-uid"),
    path("<uuid:uid>/members/", TripMemberListCreateView.as_view(), name="tripmember-list-create-by-uid"),
    path("<uuid:uid>/members/<int:user_id>/", TripMemberDetailView.as_view(), name="tripmember-detail-by-uid"),
    path("<uuid:uid>/items/", TripItemListCreateView.as_view(), name="tripitem-list-create-by-uid"),
    path("<uuid:uid>/items/<int:item_id>/", TripItemRetrieveUpdateDestroyView.as_view(), name="tripitem-detail-by-uid"),

    path("<int:pk>/", TripRetrieveUpdateDestroyView.as_view(), name="trip-detail"),
    path("<int:trip_id>/members/", TripMemberListCreateView.as_view(), name="tripmember-list-create"),
    path("<int:trip_id>/members/<int:user_id>/", TripMemberDetailView.as_view(), name="tripmember-detail"),
    path("<int:trip_id>/items/", TripItemListCreateView.as_view(), name="tripitem-list-create"),
    path("<int:trip_id>/items/<int:item_id>/", TripItemRetrieveUpdateDestroyView.as_view(), name="tripitem-detail"),

    re_path(r'^(?P<slug>[A-Za-z][-\w]*)/$', TripRetrieveUpdateDestroyView.as_view(), name="trip-detail-by-slug"),
    re_path(r'^(?P<slug>[A-Za-z][-\w]*)/members/$', TripMemberListCreateView.as_view(), name="tripmember-list-create-by-slug"),
    re_path(r'^(?P<slug>[A-Za-z][-\w]*)/members/(?P<user_id>\d+)/$', TripMemberDetailView.as_view(), name="tripmember-detail-by-slug"),
    re_path(r'^(?P<slug>[A-Za-z][-\w]*)/items/$', TripItemListCreateView.as_view(), name="tripitem-list-create-by-slug"),
    re_path(r'^(?P<slug>[A-Za-z][-\w]*)/items/(?P<item_id>\d+)/$', TripItemRetrieveUpdateDestroyView.as_view(), name="tripitem-detail-by-slug"),
]