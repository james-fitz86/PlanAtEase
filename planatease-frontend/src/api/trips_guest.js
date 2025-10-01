import { guestFetch, buildUrl } from "./client";

function base(path = "") {
  const root = buildUrl("api/trips/guest/trips");
  const clean = String(path || "").replace(/^\/+/, "");
  return clean ? `${root}${clean}/` : root;
}

export function guestListTrips(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const target = qs ? `${base()}?${qs}` : base();
  return guestFetch(target, { method: "GET" });
}

export function guestGetTrip(id) {
  return guestFetch(base(String(id)), { method: "GET" });
}

export function guestCreateTrip(payload) {
  return guestFetch(base(), { method: "POST", body: payload });
}

export function guestUpdateTrip(id, partial) {
  return guestFetch(base(String(id)), { method: "PATCH", body: partial });
}

export function guestDeleteTrip(id) {
  return guestFetch(base(String(id)), { method: "DELETE" });
}

function itemsBase(guestTripId, path = "") {
  const root = `${base(String(guestTripId))}items/`;
  const clean = String(path || "").replace(/^\/+/, "");
  return clean ? `${root}${clean}/` : root;
}

export function guestListTripItems(guestTripId) {
  return guestFetch(itemsBase(guestTripId), { method: "GET" });
}

export function guestGetTripItem(guestTripId, itemId) {
  return guestFetch(itemsBase(guestTripId, String(itemId)), { method: "GET" });
}

export function guestCreateTripItem(guestTripId, payload) {
  return guestFetch(itemsBase(guestTripId), { method: "POST", body: payload });
}

export function guestUpdateTripItem(guestTripId, itemId, partial) {
  return guestFetch(itemsBase(guestTripId, String(itemId)), { method: "PATCH", body: partial });
}

export function guestDeleteTripItem(guestTripId, itemId) {
  return guestFetch(itemsBase(guestTripId, String(itemId)), { method: "DELETE" });
}
