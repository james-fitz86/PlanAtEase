from django.contrib import admin
from .models import Trip, TripMember, TripItem

# Register your models here.
@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ("id", "uid", "slug", "name", "owner", "start_date", "end_date", "created_at")
    list_filter = ("source", "country_code", "created_at", "start_date", "end_date")
    search_fields = ("uid__hex", "slug", "name", "city_name", "formatted_address", "owner__email")
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)

    fieldsets = (
        ("Identifiers", {"fields": ("uid", "slug")}),
        ("Owner", {"fields": ("owner",)}),
        ("Basics", {"fields": ("name", "start_date", "end_date")}),
        ("Location", {"fields": ("source", "place_id", "formatted_address", "city_name", "country_code", "lat", "lng")}),
        ("Raw", {"fields": ("raw_place",)}),
        ("Timestamps", {"fields": ("created_at",)}),
    )


@admin.register(TripMember)
class TripMemberAdmin(admin.ModelAdmin):
    list_display = ("id", "trip", "user", "role", "added_at")
    list_filter = ("role", "added_at")
    search_fields = ("trip__slug", "trip__name", "user__email")
    ordering = ("-added_at",)


@admin.register(TripItem)
class TripItemAdmin(admin.ModelAdmin):
    list_display = ("id", "trip", "item_type", "place_name", "date", "start_time", "end_time")
    list_filter = ("item_type", "date")
    search_fields = ("trip__slug", "trip__name", "place_name", "formatted_address", "place_id")
    ordering = ("date", "start_time")
