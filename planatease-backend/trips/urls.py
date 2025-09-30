from django.urls import path, re_path
from .views import (
    TripListCreateView, TripRetrieveUpdateDestroyView,
    TripMemberListCreateView, TripMemberDestroyView,
    TripItemListCreateView, TripItemRetrieveUpdateDestroyView,
)

app_name = "trips"

urlpatterns = [
    # List/Create
    path("", TripListCreateView.as_view(), name="trip-list-create"),

    # 1) UID routes FIRST (always most specific)
    path("<uuid:uid>/", TripRetrieveUpdateDestroyView.as_view(), name="trip-detail-by-uid"),
    path("<uuid:uid>/members/", TripMemberListCreateView.as_view(), name="tripmember-list-create-by-uid"),
    path("<uuid:uid>/members/<int:user_id>/", TripMemberDestroyView.as_view(), name="tripmember-destroy-by-uid"),
    path("<uuid:uid>/items/", TripItemListCreateView.as_view(), name="tripitem-list-create-by-uid"),
    path("<uuid:uid>/items/<int:item_id>/", TripItemRetrieveUpdateDestroyView.as_view(), name="tripitem-detail-by-uid"),

    # 2) Legacy numeric ID routes NEXT (so numbers don’t fall into slug)
    path("<int:pk>/", TripRetrieveUpdateDestroyView.as_view(), name="trip-detail"),
    path("<int:trip_id>/members/", TripMemberListCreateView.as_view(), name="tripmember-list-create"),
    path("<int:trip_id>/members/<int:user_id>/", TripMemberDestroyView.as_view(), name="tripmember-destroy"),
    path("<int:trip_id>/items/", TripItemListCreateView.as_view(), name="tripitem-list-create"),
    path("<int:trip_id>/items/<int:item_id>/", TripItemRetrieveUpdateDestroyView.as_view(), name="tripitem-detail"),

    # 3) Slug routes LAST and CONSTRAINED (must start with a letter; avoids "1")
    re_path(r'^(?P<slug>[A-Za-z][-\w]*)/$', TripRetrieveUpdateDestroyView.as_view(), name="trip-detail-by-slug"),
    re_path(r'^(?P<slug>[A-Za-z][-\w]*)/members/$', TripMemberListCreateView.as_view(), name="tripmember-list-create-by-slug"),
    re_path(r'^(?P<slug>[A-Za-z][-\w]*)/members/(?P<user_id>\d+)/$', TripMemberDestroyView.as_view(), name="tripmember-destroy-by-slug"),
    re_path(r'^(?P<slug>[A-Za-z][-\w]*)/items/$', TripItemListCreateView.as_view(), name="tripitem-list-create-by-slug"),
    re_path(r'^(?P<slug>[A-Za-z][-\w]*)/items/(?P<item_id>\d+)/$', TripItemRetrieveUpdateDestroyView.as_view(), name="tripitem-detail-by-slug"),
]