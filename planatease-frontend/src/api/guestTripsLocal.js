const CANONICAL_KEY = "pae_guest_trips";
const CHANGE_EVENT = "pae-guest-trips-changed";

function readCanonical() {
  try {
    const raw = localStorage.getItem(CANONICAL_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function scanLegacy() {
  const trips = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i) || "";
    if (/^guestTrip:/i.test(k)) {
      try {
        const t = JSON.parse(localStorage.getItem(k));
        if (t && (t.id || t.gid || t.uid)) trips.push(t);
      } catch {}
    }
  }
  return trips;
}

function normalize(t) {
  const id = String(t.id || t.gid || t.uid || "");
  return {
    id,
    name: t.name || "",
    city_name: t.city_name || "",
    country_code: t.country_code || "",
    start_date: t.start_date || "",
    end_date: t.end_date || "",
    updated_at: t.updated_at || new Date().toISOString(),
  };
}

function mergeTrips(a, b) {
  const map = new Map();
  [...a, ...b].forEach(t => {
    const n = normalize(t);
    if (!n.id) return;
    const prev = map.get(n.id);
    const pt = prev?.updated_at ? new Date(prev.updated_at).getTime() : 0;
    const ct = n.updated_at ? new Date(n.updated_at).getTime() : 0;
    map.set(n.id, ct >= pt ? n : prev || n);
  });
  return [...map.values()];
}

function saveCanonical(trips) {
  localStorage.setItem(CANONICAL_KEY, JSON.stringify(trips.map(normalize)));
  try { window.dispatchEvent(new Event(CHANGE_EVENT)); } catch {}
}

export function bootstrapGuestTripsOnce() {
  const merged = mergeTrips(readCanonical(), scanLegacy());
  saveCanonical(merged);
  return merged;
}

export function listGuestTrips() {
  const arr = readCanonical();
  return [...arr].sort((a, b) => {
    const at = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const bt = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return bt - at;
  });
}

export function upsertGuestTrip(trip) {
  const current = readCanonical();
  const next = mergeTrips(current, [trip]);
  saveCanonical(next);
  return listGuestTrips();
}

export function removeGuestTrip(id) {
  const current = readCanonical();
  const next = current.filter(t => String(t.id) !== String(id));
  saveCanonical(next);
  return listGuestTrips();
}

export function onGuestTripsChange(handler) {
  function wrapped(e) { handler(e); }
  window.addEventListener(CHANGE_EVENT, wrapped);
  return () => window.removeEventListener(CHANGE_EVENT, wrapped);
}

export function captureGuestTrip(trip) {
  if (!trip) return;
  upsertGuestTrip(trip);
}

export function clearGuestTrips() {
  try {
    localStorage.setItem("pae_guest_trips", "[]");
    window.dispatchEvent(new Event("pae-guest-trips-changed"));
  } catch {}
}