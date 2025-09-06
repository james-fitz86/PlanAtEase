from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound
from django.shortcuts import get_object_or_404

from .models import Trip, TripMember
from .serializers import TripSerializer, TripMemberSerializer, TripMemberCreateSerializer
from .permissions import IsTripOwnerOrMemberReadOnly
# Create your views here.

class TripListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TripSerializer

    def get_queryset(self):
        u = self.request.user
        return Trip.objects.filter(Q(owner=u) | Q(members__user=u)).distinct().order_by("-created_at")


class TripRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsTripOwnerOrMemberReadOnly]
    serializer_class = TripSerializer
    queryset = Trip.objects.all()

    def get_object(self):
        obj = super().get_object()
        u = self.request.user
        if not (obj.owner_id == u.id or obj.members.filter(user=u).exists()):
            raise PermissionDenied("You do not have access to this trip.")
        return obj


class TripMemberListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def dispatch(self, request, *args, **kwargs):
        self.trip = Trip.objects.filter(id=self.kwargs["trip_id"]).first()
        if not self.trip:
            raise NotFound("Trip not found")
        return super().dispatch(request, *args, **kwargs)

    def get_queryset(self):
        u = self.request.user
        if not (self.trip.owner_id == u.id or self.trip.members.filter(user=u).exists()):
            raise PermissionDenied("You do not have access to this trip.")
        return TripMember.objects.filter(trip=self.trip).select_related("user")

    def get_serializer_class(self):
        return TripMemberCreateSerializer if self.request.method == "POST" else TripMemberSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["trip"] = self.trip
        return ctx

    def perform_create(self, serializer):
        if self.request.user.id != self.trip.owner_id:
            raise PermissionDenied("Only the owner can add members.")
        serializer.save()


class TripMemberDestroyView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    lookup_url_kwarg = "user_id"

    def dispatch(self, request, *args, **kwargs):
        self.trip = get_object_or_404(Trip, pk=self.kwargs["trip_id"])
        return super().dispatch(request, *args, **kwargs)

    def _resolve_user_id(self, raw):
        if str(raw).lower() == "me":
            return self.request.user.id
        try:
            return int(raw)
        except (TypeError, ValueError):
            raise NotFound("Invalid member id.")

    def get_object(self):
        target_user_id = self._resolve_user_id(self.kwargs[self.lookup_url_kwarg])
        member = get_object_or_404(TripMember, trip=self.trip, user_id=target_user_id)
        return member

    def delete(self, request, *args, **kwargs):
        member = self.get_object()

        if member.user_id == self.trip.owner_id:
            raise PermissionDenied("Cannot remove the trip owner.")

        if not (request.user.id == self.trip.owner_id or request.user.id == member.user_id):
            raise PermissionDenied("You don't have permission to remove this member.")

        member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
