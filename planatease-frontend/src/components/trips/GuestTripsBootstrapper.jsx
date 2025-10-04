import { useEffect } from "react";
import { bootstrapGuestTripsOnce } from "../../api/guestTripsLocal";

export default function GuestTripsBootstrapper() {
  useEffect(() => { bootstrapGuestTripsOnce(); }, []);
  return null;
}
