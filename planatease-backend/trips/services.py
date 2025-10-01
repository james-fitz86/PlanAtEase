from django.utils import timezone
from django.db import transaction
from .models import GuestTrip, GuestTripItem, Trip, TripItem

def promote_guest_trips_to_user(request, user):
    gid = request.session.get("guest_id")
    if not gid:
        return {"found": 0, "promoted": 0}

    qs = GuestTrip.objects.filter(guest_id=gid, expires_at__gt=timezone.now())
    found = qs.count()
    if not found:
        return {"found": 0, "promoted": 0}

    promoted = 0
    with transaction.atomic():
        for g in qs.select_for_update():
            trip = Trip.objects.create(
                owner=user,
                name=g.name,
                start_date=g.start_date,
                end_date=g.end_date,
                source=g.source,
                place_id=g.place_id,
                formatted_address=g.formatted_address,
                city_name=g.city_name,
                country_code=g.country_code,
                lat=g.lat,
                lng=g.lng,
                raw_place=g.raw_place,
            )

            guest_items = list(GuestTripItem.objects.filter(guest_trip=g))
            TripItem.objects.bulk_create([
                TripItem(
                    trip=trip,
                    created_by=None,
                    item_type=gi.item_type,
                    date=gi.date,
                    start_time=gi.start_time,
                    end_time=gi.end_time,
                    place_id=gi.place_id,
                    place_name=gi.place_name,
                    formatted_address=gi.formatted_address,
                    lat=gi.lat,
                    lng=gi.lng,
                    title=gi.title,
                    description=gi.description,
                    raw_place=gi.raw_place,
                ) for gi in guest_items
            ])

            g.delete()
            promoted += 1

    return {"found": found, "promoted": promoted}
