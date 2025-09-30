from django.db import migrations
from django.utils.text import slugify
import uuid


def backfill_uid_and_slug(apps, schema_editor):
    Trip = apps.get_model("trips", "Trip")

    existing_slugs = set(
        Trip.objects.exclude(slug__isnull=True).exclude(slug__exact="").values_list("slug", flat=True)
    )

    def unique_slug(base, pk_hint):
        base_slug = slugify(base)[:150] if base else ""
        if not base_slug:
            base_slug = f"trip-{pk_hint}"
        candidate = base_slug
        i = 0
        while candidate in existing_slugs:
            i += 1
            candidate = f"{base_slug}-{uuid.uuid4().hex[:6]}"
            if len(candidate) > 160:
                candidate = candidate[:160]
        existing_slugs.add(candidate)
        return candidate

    qs = Trip.objects.all().only("id", "name", "city_name", "uid", "slug")
    for trip in qs.iterator():
        changed = False
        if not trip.uid:
            trip.uid = uuid.uuid4()
            changed = True
        if not trip.slug:
            base = trip.name or trip.city_name or ""
            trip.slug = unique_slug(base, trip.id)
            changed = True
        if changed:
            trip.save(update_fields=["uid", "slug"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('trips', '0003_trip_slug_trip_uid'),
    ]

    operations = [
        migrations.RunPython(backfill_uid_and_slug, noop_reverse),
    ]
