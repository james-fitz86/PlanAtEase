const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL;
const API_BASE = RAW_API_BASE.replace(/\/+$/, "");
const TRIPS_BASE = `${API_BASE}/api/trips`;

if (import.meta.env.DEV) {
  console.log("TRIPS_BASE =", TRIPS_BASE);
}

function url(path = "") {
  const clean = path.replace(/^\/+/, "");
  return clean ? `${TRIPS_BASE}/${clean}/` : `${TRIPS_BASE}/`;
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

export function getTrip(identifier) {
  return http("GET", url(identifier));
}

export function createTrip(payload) {
  return http("POST", url(""), payload);
}

export function updateTrip(identifier, partial) {
  return http("PATCH", url(identifier), partial);
}

export function deleteTrip(identifier) {
  return http("DELETE", url(identifier));
}

export function listTripMembers(identifier) {
  return http("GET", url(`${identifier}/members`));
}

export function addTripMember(identifier, payload) {
  return http("POST", url(`${identifier}/members`), payload);
}

export function removeTripMember(identifier, userId) {
  return http("DELETE", url(`${identifier}/members/${userId}`));
}

export function listTripItems(identifier) {
  return http("GET", url(`${identifier}/items`));
}

export function getTripItem(identifier, itemId) {
  return http("GET", url(`${identifier}/items/${itemId}`));
}

export function createTripItem(identifier, payload) {
  return http("POST", url(`${identifier}/items`), payload);
}

export function updateTripItem(identifier, itemId, partial) {
  return http("PATCH", url(`${identifier}/items/${itemId}`), partial);
}

export function deleteTripItem(identifier, itemId) {
  return http("DELETE", url(`${identifier}/items/${itemId}`));
}
