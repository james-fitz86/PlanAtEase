from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound
from django.shortcuts import get_object_or_404

from .models import Trip, TripMember, TripItem
from .serializers import TripSerializer, TripMemberSerializer, TripMemberCreateSerializer, TripItemSerializer, TripItemCreateSerializer
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
        """
        Resolve by uid, then slug, then pk (for backward compatibility).
        Still enforce owner/member access.
        """
        kwargs = self.kwargs
        trip = None

        if "uid" in kwargs:
            trip = Trip.objects.filter(uid=kwargs["uid"]).first()
        elif "slug" in kwargs:
            trip = Trip.objects.filter(slug=kwargs["slug"]).first()
        elif "pk" in kwargs:
            trip = Trip.objects.filter(pk=kwargs["pk"]).first()

        if not trip:
            raise NotFound("Trip not found.")


        u = self.request.user
        if not (trip.owner_id == u.id or trip.members.filter(user=u).exists()):
            raise NotFound("Trip not found.")
        return trip


class TripMemberListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def dispatch(self, request, *args, **kwargs):
        """
        Accept trip via uid/slug or legacy trip_id.
        """
        if "uid" in kwargs:
            self.trip = Trip.objects.filter(uid=kwargs["uid"]).first()
        elif "slug" in kwargs:
            self.trip = Trip.objects.filter(slug=kwargs["slug"]).first()
        elif "trip_id" in kwargs:
            self.trip = Trip.objects.filter(pk=kwargs["trip_id"]).first()
        if not self.trip:
            raise NotFound("Trip not found.")
        return super().dispatch(request, *args, **kwargs)

    def get_queryset(self):
        u = self.request.user
        if not (self.trip.owner_id == u.id or self.trip.members.filter(user=u).exists()):
            raise NotFound("Trip not found.")
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


class TripMemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /trips/<id|uid|slug>/members/<user_id>/
    PATCH  /trips/<id|uid|slug>/members/<user_id>/  {"role": "viewer"|"editor"}  (owner only)
    DELETE /trips/<id|uid|slug>/members/<user_id>/  (owner or self)
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TripMemberSerializer
    lookup_url_kwarg = "user_id"

    def dispatch(self, request, *args, **kwargs):
        if "uid" in kwargs:
            self.trip = Trip.objects.filter(uid=kwargs["uid"]).first()
        elif "slug" in kwargs:
            self.trip = Trip.objects.filter(slug=kwargs["slug"]).first()
        elif "trip_id" in kwargs:
            self.trip = Trip.objects.filter(pk=kwargs["trip_id"]).first()
        if not self.trip:
            raise NotFound("Trip not found.")
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
        u = self.request.user
        if not (self.trip.owner_id == u.id or self.trip.members.filter(user=u).exists()):
            raise NotFound("Trip not found.")
        return member

    # --- UPDATE (role change) ---
    def partial_update(self, request, *args, **kwargs):
        """
        Owner-only role change. Owner's role cannot be changed.
        """
        if request.user.id != self.trip.owner_id:
            raise PermissionDenied("Only the owner can change roles.")

        member = self.get_object()
        if member.user_id == self.trip.owner_id:
            raise PermissionDenied("Cannot change the owner's role.")

        serializer = self.get_serializer(member, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        if set(serializer.validated_data.keys()) - {"role"}:
            raise PermissionDenied("Only the role can be updated.")
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        member = self.get_object()

        if member.user_id == self.trip.owner_id:
            raise PermissionDenied("Cannot remove the trip owner.")

        if not (request.user.id == self.trip.owner_id or request.user.id == member.user_id):
            raise PermissionDenied("You don't have permission to remove this member.")

        member.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class TripItemListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def dispatch(self, request, *args, **kwargs):
        if "uid" in kwargs:
            self.trip = Trip.objects.filter(uid=kwargs["uid"]).first()
        elif "slug" in kwargs:
            self.trip = Trip.objects.filter(slug=kwargs["slug"]).first()
        elif "trip_id" in kwargs:
            self.trip = Trip.objects.filter(pk=kwargs["trip_id"]).first()
        if not self.trip:
            raise NotFound("Trip not found.")
        return super().dispatch(request, *args, **kwargs)

    def get_queryset(self):
        u = self.request.user
        if not (self.trip.owner_id == u.id or self.trip.members.filter(user=u).exists()):
            raise NotFound("Trip not found.")
        return TripItem.objects.filter(trip=self.trip).order_by("date", "start_time")

    def get_serializer_class(self):
        return TripItemCreateSerializer if self.request.method == "POST" else TripItemSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["trip"] = self.trip
        return ctx

    def perform_create(self, serializer):
        u = self.request.user
        
        if not (self.trip.owner_id == u.id or self.trip.members.filter(user=u, role="editor").exists()):
            raise PermissionDenied("You do not have permission to add trip items.")
        serializer.save()


class TripItemRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TripItemSerializer
    lookup_url_kwarg = "item_id"

    def dispatch(self, request, *args, **kwargs):
        if "uid" in kwargs:
            self.trip = Trip.objects.filter(uid=kwargs["uid"]).first()
        elif "slug" in kwargs:
            self.trip = Trip.objects.filter(slug=kwargs["slug"]).first()
        elif "trip_id" in kwargs:
            self.trip = Trip.objects.filter(pk=kwargs["trip_id"]).first()
        if not self.trip:
            raise NotFound("Trip not found.")
        return super().dispatch(request, *args, **kwargs)

    def get_queryset(self):
        u = self.request.user
        if not (self.trip.owner_id == u.id or self.trip.members.filter(user=u).exists()):
            raise PermissionDenied("You do not have access to this trip.")
        return TripItem.objects.filter(trip=self.trip)

    def perform_update(self, serializer):
        u = self.request.user
        if not (self.trip.owner_id == u.id or self.trip.members.filter(user=u, role="editor").exists()):
            raise PermissionDenied("You do not have permission to edit trip items.")
        serializer.save()

    def perform_destroy(self, instance):
        u = self.request.user
        if not (self.trip.owner_id == u.id or self.trip.members.filter(user=u, role="editor").exists()):
            raise PermissionDenied("You do not have permission to delete trip items.")
        instance.delete()