import { buildUrl } from "./client";
import { getTokens } from "../auth/storage";

const URL = buildUrl("api/trips/guest/transfer");

export async function transferGuestTrips() {
  const tokens = getTokens();
  const headers = { "Content-Type": "application/json" };
  if (tokens?.access) headers.Authorization = `Bearer ${tokens.access}`;

  const res = await fetch(`${URL}`, {
    method: "POST",
    headers,
    credentials: "include",
  });

  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}

  if (!res.ok) {
    const err = new Error(json?.detail || res.statusText || "Request failed");
    err.status = res.status;
    err.body = json || text;
    throw err;
  }
  return json;
}