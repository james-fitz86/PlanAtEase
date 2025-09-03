from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound

from .models import Trip, TripMember
from .serializers import TripSerializer, TripMemberSerializer
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
    serializer_class = TripMemberSerializer

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

    def create(self, request, *args, **kwargs):
        if self.trip.owner_id != request.user.id:
            raise PermissionDenied("Only the owner can add members.")
        user_id = request.data.get("user")
        role = request.data.get("role", "editor")
        if not user_id:
            return Response({"user": "This field is required."}, status=status.HTTP_400_BAD_REQUEST)

        if int(user_id) == self.trip.owner_id:
            return Response({"user": "Owner need not be added as a member."}, status=status.HTTP_400_BAD_REQUEST)

        member, created = TripMember.objects.get_or_create(
            trip=self.trip, user_id=user_id, defaults={"role": role}
        )
        if not created:
            member.role = role
            member.save()

        return Response(TripMemberSerializer(member).data, status=status.HTTP_201_CREATED)


class TripMemberDestroyView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def dispatch(self, request, *args, **kwargs):
        self.trip = Trip.objects.filter(id=self.kwargs["trip_id"]).first()
        if not self.trip:
            raise NotFound("Trip not found")
        return super().dispatch(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        if self.trip.owner_id != request.user.id:
            raise PermissionDenied("Only the owner can remove members.")
        user_id = self.kwargs["user_id"]
        deleted, _ = TripMember.objects.filter(trip=self.trip, user_id=user_id).delete()
        if not deleted:
            return Response({"detail": "Member not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)
