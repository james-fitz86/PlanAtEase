import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import PageContainer from "../../components/base/PageContainer";
import CreateTripItem from "../../components/trips/CreateTripItem";
import Itinerary from "../../components/trips/Itinerary";
import TripMap from "../../components/trips/TripMap";
import { countryNameFromCode } from "../../utils/geo";
import {
  guestGetTrip,
  guestListTripItems,
  guestCreateTripItem,
  guestUpdateTripItem,
  guestDeleteTripItem,
} from "../../api/trips_guest";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function tripTitle(trip) {
  const name = trip?.name?.trim();
  const city = trip?.city_name?.trim();
  const formatted = trip?.formatted_address?.trim();
  if (name && city && name.toLowerCase() !== city.toLowerCase()) return name;
  if (city) return `Trip to ${city}`;
  if (formatted) return formatted;
  return "Trip";
}

function daysLeft(expiresAt) {
  if (!expiresAt) return null;
  const now = Date.now();
  const then = new Date(expiresAt).getTime();
  if (!Number.isFinite(then)) return null;
  const ms = then - now;
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export default function GuestTripDetailPage() {
  const { guestTripId, id } = useParams();
  const gid = guestTripId || id;

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [itemsVersion, setItemsVersion] = useState(0);
  const [dayFilter, setDayFilter] = useState(null);
  const [bannerClosed, setBannerClosed] = useState(false);

  const itemsForMap = useMemo(
    () => (dayFilter ? items.filter((it) => it.date === dayFilter) : items),
    [items, dayFilter]
  );

  function refreshItems() {
    setItemsVersion((v) => v + 1);
  }

  useEffect(() => {
    if (!gid) return;
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const t = await guestGetTrip(gid);
        if (!alive) return;
        setTrip(t);
      } catch (e) {
        if (alive) setErr(e.body?.detail || e.message || "Failed to load guest trip");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [gid]);

  useEffect(() => {
    if (!gid) return;
    let alive = true;
    (async () => {
      try {
        const data = await guestListTripItems(gid);
        if (!alive) return;
        const arr = Array.isArray(data?.results) ? data.results : data || [];
        setItems(arr);
      } catch (e) {
        console.error("Failed to load guest items", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [gid, itemsVersion]);

  if (loading) {
    return <div className="p-6">Loading…</div>;
  }
  if (err) {
    return <div className="p-6 text-danger">{err}</div>;
  }
  if (!trip) {
    return <div className="p-6">Trip not found.</div>;
  }

  const dLeft = daysLeft(trip.expires_at);
  const center =
    trip?.lat != null && trip?.lng != null
      ? { lat: Number(trip.lat), lng: Number(trip.lng) }
      : undefined;

  return (
    <PageContainer className="my-3">
      {!bannerClosed && (
        <div className="alert alert-warning d-flex align-items-start justify-content-between" role="alert">
          <div className="me-3">
            <strong>Guest trip</strong> — This trip will expire
            {dLeft === 0 ? " today" : dLeft != null ? ` in ${dLeft} day${dLeft === 1 ? "" : "s"}` : ""}.
            <br />
            <span className="small">
              Register and activate within 14 days of creation to keep it permanently and unlock extra features.
            </span>
          </div>
          <div className="d-flex gap-2">
            <Link to="/register" className="btn btn-sm btn-primary">
              Save my trip
            </Link>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setBannerClosed(true)}
              aria-label="Dismiss"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <header className="mb-4">
        <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3">
            <div className="text-center flex-grow-1">
                <h1 className="h4 mb-1">{tripTitle(trip)}</h1>
                <p className="text-muted small mb-0">
                {formatDate(trip.start_date)} → {formatDate(trip.end_date)}
                </p>
                <p>
                {trip.city_name || "-"}, {countryNameFromCode(trip?.country_code)}
                </p>
            </div>

            <div className="d-flex flex-column flex-sm-row gap-2">
                <Link to="/" className="btn btn-outline-secondary btn-sm">
                    Back to Home
                </Link>
                <Link to={`/guest/trips/${gid}/edit`} className="btn btn-primary btn-sm">
                    Edit
                </Link>
            </div>
        </div>
      </header>

      <div className="row g-2 g-md-4">
        <div className="col-12 col-md-7 col-lg-7">
          <div className="row g-4">
            <div className="col-12">
              <div className="card border-0 bg-light">
                <div className="card-body">
                  <strong>Members</strong>
                  <p className="mb-0 small text-muted">
                    Available for registered users. Add collaborators and set roles after you sign up.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-12">
              <CreateTripItem
                tripId={null}
                parentId={gid}
                tripStart={trip.start_date}
                tripEnd={trip.end_date}
                onCreated={refreshItems}
                defaultDate={dayFilter}
                createFn={guestCreateTripItem}
              />
            </div>

            <Itinerary
              start={trip.start_date}
              end={trip.end_date}
              tripId={null}
              parentId={gid}
              tripLat={trip.lat}
              tripLng={trip.lng}
              refreshTick={itemsVersion}
              onItemsChanged={refreshItems}
              onDayFilterChange={setDayFilter}
              listFn={guestListTripItems}
              deleteFn={guestDeleteTripItem}
              updateFn={guestUpdateTripItem}
              allowDayView={false}
              allowEdit={true}
            />
          </div>
        </div>

        <aside className="col-12 col-md-5 col-lg-5 col-sticky">
          <div className="sticky-map border rounded-3 overflow-hidden" style={{ minHeight: 380 }}>
            <TripMap
              apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
              items={itemsForMap}
              center={center}
            />
          </div>

          <div className="mt-3 small text-muted">
            Weather details and Day View are available after registration.
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}
