import { Link } from "react-router-dom";
import { listGuestTrips, removeGuestTrip, onGuestTripsChange } from "../../api/guestTripsLocal";
import { useEffect, useState } from "react";

function fmtRange(a, b) {
  if (!a && !b) return "-";
  const aa = a ? new Date(a) : null;
  const bb = b ? new Date(b) : null;
  const sd = aa ? aa.toLocaleDateString() : "";
  const ed = bb ? bb.toLocaleDateString() : "";
  return sd && ed ? `${sd} → ${ed}` : sd || ed || "-";
}

export default function GuestTripsPage() {
  const [trips, setTrips] = useState(() => listGuestTrips());

  useEffect(() => {
    const off = onGuestTripsChange(() => setTrips(listGuestTrips()));
    return off;
  }, []);

  if (!trips.length) {
    return (
      <main className="container py-4">
        <h1 className="h4">Guest trips</h1>
        <p className="text-muted">No guest trips were found on this device.</p>
      </main>
    );
  }

  return (
    <main className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h1 className="h4 mb-0">Guest trips</h1>
        <span className="badge text-bg-primary">{trips.length}</span>
      </div>

      <div className="row g-3">
        {trips.map(t => (
          <div className="col-12 col-sm-6 col-lg-4" key={t.id}>
            <div className="card h-100">
              <div className="card-body d-flex flex-column">
                <h2 className="h6 mb-1">{t.name || t.city_name || "Trip"}</h2>
                <p className="small text-muted mb-2">
                  {(t.city_name || "-")}{t.country_code ? `, ${t.country_code}` : ""}<br />
                  {fmtRange(t.start_date, t.end_date)}
                </p>
                <div className="mt-auto d-flex gap-2">
                  <Link className="btn btn-sm btn-primary" to={`/guest/trips/${t.id}`}>Open</Link>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => {
                      removeGuestTrip(t.id);
                      setTrips(listGuestTrips());
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
