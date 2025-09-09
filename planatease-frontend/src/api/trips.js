const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL;
const API_BASE = RAW_API_BASE.replace(/\/+$/, "");
const TRIPS_BASE = `${API_BASE}/api/trips`;

if (import.meta.env.DEV) {
  console.log("TRIPS_BASE =", TRIPS_BASE);
}

function url(path = "") {
  return `${TRIPS_BASE}${path}/`;
}

function authHeaders() {
  try {
    const raw = localStorage.getItem("auth");
    const tokens = raw ? JSON.parse(raw) : null;
    const access = tokens?.access;
    return access ? { Authorization: `Bearer ${access}` } : {};
  } catch {
    return {};
  }
}

async function http(method, urlStr, body) {
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "omit",
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(urlStr, opts);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
  }
  if (!res.ok) {
    const err = new Error(json?.detail || res.statusText || "Request failed");
    err.status = res.status;
    err.body = json || text;
    throw err;
  }
  return json;
}

export function listTrips(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const target = qs ? `${url("")}?${qs}` : url("");
  return http("GET", target);
}

export function getTrip(id) {
  return http("GET", url(`/${id}`));
}

export function createTrip(payload) {
  return http("POST", url(""), payload);
}

export function updateTrip(id, partial) {
  return http("PATCH", url(`/${id}`), partial);
}

export function deleteTrip(id) {
  return http("DELETE", url(`/${id}`));
}

export function listTripMembers(tripId) {
  return http("GET", url(`/${tripId}/members`));
}


export function addTripMember(tripId, payload) {
  return http("POST", url(`/${tripId}/members`), payload);
}

export function removeTripMember(tripId, userId) {
  return http("DELETE", url(`/${tripId}/members/${userId}`));
}
