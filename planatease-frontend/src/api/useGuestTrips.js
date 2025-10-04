import { useEffect, useMemo, useState } from "react";

const CANONICAL_KEY = "pae_guest_trips";

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
    const prev = map.get(n.id);
    const pt = prev?.updated_at ? new Date(prev.updated_at).getTime() : 0;
    const ct = n.updated_at ? new Date(n.updated_at).getTime() : 0;
    map.set(n.id, ct >= pt ? n : prev || n);
  });
  return [...map.values()];
}

function saveCanonical(trips) {
  localStorage.setItem(CANONICAL_KEY, JSON.stringify(trips.map(normalize)));
}

export function getGuestTripsOnce() {
  const merged = mergeTrips(readCanonical(), scanLegacy());
  saveCanonical(merged);
  return merged;
}

export default function useGuestTrips() {
  const [trips, setTrips] = useState(() => getGuestTripsOnce());

  useEffect(() => {
    const onStorage = e => {
      if (!e) return;
      const k = e.key || "";
      if (k === CANONICAL_KEY || /^guestTrip:/i.test(k)) {
        setTrips(getGuestTripsOnce());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const sorted = useMemo(() => {
    return [...trips].sort((a, b) => {
      const at = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const bt = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return bt - at;
    });
  }, [trips]);

  function removeTrip(id) {
    const next = sorted.filter(t => String(t.id) !== String(id));
    saveCanonical(next);
    setTrips(next);
  }

  function upsertTrip(t) {
    const next = mergeTrips(sorted, [t]);
    saveCanonical(next);
    setTrips(next);
  }

  return { trips: sorted, count: sorted.length, removeTrip, upsertTrip };
}
