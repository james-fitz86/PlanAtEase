import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { listGuestTrips, onGuestTripsChange } from "../../api/guestTripsLocal";

function fmtRange(a, b) {
  if (!a && !b) return "-";
  const aa = a ? new Date(a) : null;
  const bb = b ? new Date(b) : null;
  const sd = aa ? aa.toLocaleDateString() : "";
  const ed = bb ? bb.toLocaleDateString() : "";
  return sd && ed ? `${sd} → ${ed}` : sd || ed || "-";
}

export default function HeaderGuestTrips({ isLoggedIn }) {
  const [trips, setTrips] = useState(() => listGuestTrips());
  const { pathname } = useLocation();

  useEffect(() => {
    const off = onGuestTripsChange(() => setTrips(listGuestTrips()));
    return off;
  }, []);

  if (isLoggedIn) return null;
  if (!trips.length) return null;

  return (
    <li className="nav-item dropdown">
      <a
        className="nav-link dropdown-toggle d-flex align-items-center gap-2"
        href="#"
        id="guestTripsDropdown"
        role="button"
        data-bs-toggle="dropdown"
        aria-expanded="false"
      >
        Guest trips
        <span className="badge rounded-pill text-bg-primary">{trips.length}</span>
      </a>
      <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="guestTripsDropdown" style={{ minWidth: 320 }}>
        {trips.slice(0, 6).map(t => (
          <li key={t.id}>
            <Link className="dropdown-item d-flex flex-column" to={`/guest/trips/${t.id}`}>
              <span className="fw-semibold">{t.name || t.city_name || "Trip"}</span>
              <small className="text-muted">
                {(t.city_name || "-")}{t.country_code ? `, ${t.country_code}` : ""} · {fmtRange(t.start_date, t.end_date)}
              </small>
            </Link>
          </li>
        ))}
        {trips.length > 6 && <li><hr className="dropdown-divider" /></li>}
        {trips.length > 6 && (
          <li>
            <Link className="dropdown-item" to="/guest/trips">View all guest trips</Link>
          </li>
        )}
        {pathname.startsWith("/guest/trips/") ? null : (
          <>
            <li><hr className="dropdown-divider" /></li>
            <li>
              <Link className="dropdown-item" to={`/guest/trips/${trips[0].id}`}>Resume last trip</Link>
            </li>
          </>
        )}
      </ul>
    </li>
  );
}
