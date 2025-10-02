from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
from rest_framework.throttling import ScopedRateThrottle
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from .models import Trip, TripMember, TripItem, GuestTrip, GuestTripItem
from .serializers import (
    TripSerializer, TripMemberSerializer, TripMemberCreateSerializer,
    TripItemSerializer, TripItemCreateSerializer,
    GuestTripSerializer, GuestTripItemSerializer, GuestTripItemCreateSerializer
)
from .permissions import IsTripOwnerOrMemberReadOnly
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication
from .services import promote_guest_trips_to_user


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

GUEST_TTL_DAYS = 14

def _request_or_issue_guest_id(request):
    hdr = (request.META.get("HTTP_X_GUEST_ID") or "").strip()
    if hdr:
        return hdr

    gid = request.session.get("guest_id")
    if gid:
        return gid
    if not request.session.session_key:
        request.session.save()
    gid = request.session.session_key
    request.session["guest_id"] = gid
    request.session.modified = True
    return gid

def _ensure_not_expired(obj):
    if obj.expires_at <= timezone.now():
        raise NotFound("Guest trip expired.")

def _with_guest_header(response, gid: str):
    if gid:
        response["X-Guest-Id"] = gid
    return response


@method_decorator(csrf_exempt, name="dispatch")
class GuestTripListCreateView(generics.ListCreateAPIView):
    """
    GET  /guest/trips/   -> list guest trips for this session
    POST /guest/trips/   -> create a new GuestTrip (expires_at = now + 14 days)
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    serializer_class = GuestTripSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "guest_write"

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self.gid = _request_or_issue_guest_id(request)

    def get_queryset(self):
        return GuestTrip.objects.filter(
            guest_id=self.gid,
            expires_at__gt=timezone.now()
        ).order_by("-created_at")

    def perform_create(self, serializer):
        now = timezone.now()
        serializer.save(
            guest_id=self.gid,
            expires_at=now + timedelta(days=GUEST_TTL_DAYS),
        )

    def list(self, request, *args, **kwargs):
        resp = super().list(request, *args, **kwargs)
        return _with_guest_header(resp, self.gid)

    def create(self, request, *args, **kwargs):
        resp = super().create(request, *args, **kwargs)
        return _with_guest_header(resp, self.gid)



@method_decorator(csrf_exempt, name="dispatch")
class GuestTripRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /guest/trips/<guest_trip_id>/
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    serializer_class = GuestTripSerializer
    queryset = GuestTrip.objects.all()
    lookup_url_kwarg = "guest_trip_id"

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self.gid = _request_or_issue_guest_id(request)

    def get_object(self):
        obj = super().get_object()
        if obj.guest_id != self.gid:
            raise NotFound("Guest trip not found.")
        _ensure_not_expired(obj)
        return obj

    def retrieve(self, request, *args, **kwargs):
        resp = super().retrieve(request, *args, **kwargs)
        return _with_guest_header(resp, self.gid)

    def partial_update(self, request, *args, **kwargs):
        resp = super().partial_update(request, *args, **kwargs)
        return _with_guest_header(resp, self.gid)

    def destroy(self, request, *args, **kwargs):
        resp = super().destroy(request, *args, **kwargs)
        return _with_guest_header(resp, self.gid)


@method_decorator(csrf_exempt, name="dispatch")
class GuestTripItemListCreateView(generics.ListCreateAPIView):
    """
    GET  /guest/trips/<guest_trip_id>/items/
    POST /guest/trips/<guest_trip_id>/items/
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "guest_write"

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self.gid = _request_or_issue_guest_id(request)

    def dispatch(self, request, *args, **kwargs):
        self.guest_trip = GuestTrip.objects.filter(
            pk=kwargs.get("guest_trip_id"),
            guest_id=self.gid
        ).first()
        if not self.guest_trip:
            raise NotFound("Guest trip not found.")
        _ensure_not_expired(self.guest_trip)
        return super().dispatch(request, *args, **kwargs)

    def get_queryset(self):
        return GuestTripItem.objects.filter(
            guest_trip=self.guest_trip
        ).order_by("date", "start_time")

    def get_serializer_class(self):
        return GuestTripItemCreateSerializer if self.request.method == "POST" else GuestTripItemSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["guest_trip"] = self.guest_trip
        return ctx

    def list(self, request, *args, **kwargs):
        resp = super().list(request, *args, **kwargs)
        return _with_guest_header(resp, self.gid)

    def create(self, request, *args, **kwargs):
        resp = super().create(request, *args, **kwargs)
        return _with_guest_header(resp, self.gid)



@method_decorator(csrf_exempt, name="dispatch")
class GuestTripItemRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /guest/trips/<guest_trip_id>/items/<item_id>/
    """
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "guest_write"
    serializer_class = GuestTripItemSerializer
    lookup_url_kwarg = "item_id"

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        self.gid = _request_or_issue_guest_id(request)

    def dispatch(self, request, *args, **kwargs):
        self.guest_trip = GuestTrip.objects.filter(
            pk=kwargs.get("guest_trip_id"),
            guest_id=self.gid
        ).first()
        if not self.guest_trip:
            raise NotFound("Guest trip not found.")
        _ensure_not_expired(self.guest_trip)
        return super().dispatch(request, *args, **kwargs)

    def get_queryset(self):
        return GuestTripItem.objects.filter(guest_trip=self.guest_trip)

    def retrieve(self, request, *args, **kwargs):
        resp = super().retrieve(request, *args, **kwargs)
        return _with_guest_header(resp, self.gid)

    def partial_update(self, request, *args, **kwargs):
        resp = super().partial_update(request, *args, **kwargs)
        return _with_guest_header(resp, self.gid)

    def destroy(self, request, *args, **kwargs):
        resp = super().destroy(request, *args, **kwargs)
        return _with_guest_header(resp, self.gid)


@method_decorator(csrf_exempt, name="dispatch")
class GuestTripTransferView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def post(self, request):
        gid = (request.META.get("HTTP_X_GUEST_ID") or request.session.get("guest_id") or "").strip()
        if not gid:
            return Response({"transferred": []}, status=status.HTTP_200_OK)

        request.session["guest_id"] = gid
        summary = promote_guest_trips_to_user(request, request.user)
        count = int(summary.get("promoted", 0) or 0)

        resp = Response({"transferred": [None] * count}, status=status.HTTP_200_OK)
        resp["X-Guest-Id"] = gid
        return resp