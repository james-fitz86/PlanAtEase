from django.urls import path
from .views import (
    TripListCreateView, TripRetrieveUpdateDestroyView,
    TripMemberListCreateView, TripMemberDestroyView,
)

app_name = "trips"

urlpatterns = [
    path("", TripListCreateView.as_view(), name="trip-list-create"),
    path("<int:pk>/", TripRetrieveUpdateDestroyView.as_view(), name="trip-detail"),
    path("<int:trip_id>/members/", TripMemberListCreateView.as_view(), name="tripmember-list-create"),
    path("<int:trip_id>/members/<int:user_id>/", TripMemberDestroyView.as_view(), name="tripmember-destroy"),
]
