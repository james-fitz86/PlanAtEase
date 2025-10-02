import { guestFetch, buildUrl } from "./client";

export function transferGuestTrips() {
  const url = buildUrl("api/trips/guest/transfer");
  return guestFetch(url, { method: "POST" });
}