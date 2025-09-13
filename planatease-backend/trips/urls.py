from django.urls import path
from .views import (
    TripListCreateView, TripRetrieveUpdateDestroyView,
    TripMemberListCreateView, TripMemberDestroyView,
    TripItemListCreateView, TripItemRetrieveUpdateDestroyView,
)

app_name = "trips"

urlpatterns = [
    path("", TripListCreateView.as_view(), name="trip-list-create"),
    path("<int:pk>/", TripRetrieveUpdateDestroyView.as_view(), name="trip-detail"),
    path("<int:trip_id>/members/", TripMemberListCreateView.as_view(), name="tripmember-list-create"),
    path("<int:trip_id>/members/<int:user_id>/", TripMemberDestroyView.as_view(), name="tripmember-destroy"),
    path("<int:trip_id>/items/", TripItemListCreateView.as_view(), name="tripitem-list-create"),
    path("<int:trip_id>/items/<int:item_id>/", TripItemRetrieveUpdateDestroyView.as_view(), name="tripitem-detail"),
]
