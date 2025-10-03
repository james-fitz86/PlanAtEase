import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getTrip, listTripMembers, deleteTrip, listTripItems } from "../../api/trips";
import MemberCard from "../../components/trips/MemberCard";
import Itinerary from "../../components/trips/Itinerary";
import CreateTripItem from "../../components/trips/CreateTripItem";
import PageContainer from "../../components/base/PageContainer";
import { countryNameFromCode } from "../../utils/geo";
import TripMap from "../../components/trips/TripMap";
import backdrop from "../../assets/images/backdrop.png";

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

export default function TripDetailPage() {
  const { tripUid, id } = useParams();
  const tripKey = tripUid || id;

  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [itemsVersion, setItemsVersion] = useState(0);
  const [items, setItems] = useState([]);
  const [dayFilter, setDayFilter] = useState(null);

  const itemsForMap = useMemo(() => {
    const base = dayFilter ? items.filter((it) => it.date === dayFilter) : items;
    return base.map((it) => {
      const lat =
        it.lat ??
        it.place?.geometry?.location?.lat ??
        it.place?.lat ??
        it.raw_place?.location?.lat ??
        null;
      const lng =
        it.lng ??
        it.place?.geometry?.location?.lng ??
        it.place?.lng ??
        it.raw_place?.location?.lng ??
        null;
      return { ...it, lat, lng };
    });
  }, [items, dayFilter]);


  async function refreshMembers() {
    try {
      const m = await listTripMembers(tripKey);
      setMembers(m);
    } catch (e) {
    }
  }

  function refreshItems() {
    setItemsVersion((v) => v + 1);
  }

  useEffect(() => {
    if (!tripKey) return;
    let alive = true;

    (async () => {
      try {
        const data = await listTripItems(tripKey);
        if (!alive) return;
        const arr = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        setItems(arr);
      } catch (e) {
      }
    })();

    return () => {
      alive = false;
    };
  }, [tripKey, itemsVersion]);

  useEffect(() => {
    if (!tripKey) return;
    let alive = true;

    (async () => {
      try {
        const [t, m] = await Promise.all([getTrip(tripKey), listTripMembers(tripKey)]);
        if (!alive) return;
        setTrip(t);
        setMembers(m);
      } catch (e) {
        setErr(e.body?.detail || e.message || "Failed to load trip");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [tripKey]);

  async function handleDelete() {
    if (!trip || deleting) return;
    const ok = window.confirm("Delete this trip? This cannot be undone.");
    if (!ok) return;

    try {
      setDeleting(true);
      await deleteTrip(trip.uid || trip.id);
      navigate("/dashboard");
    } catch (e) {
      setDeleting(false);
      alert(e.body?.detail || e.message || "Failed to delete trip");
    }
  }

  if (loading) {
    return (
      <PageContainer className="my-3">
        <div className="d-flex align-items-center gap-2">
          <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
          <span className="text-muted">Loading…</span>
        </div>
      </PageContainer>
    );
  }
  if (err) {
    return (
      <PageContainer className="my-3">
        <div className="alert alert-danger mb-0">{err}</div>
      </PageContainer>
    );
  }
  if (!trip) {
    return (
      <PageContainer className="my-3">
        <div className="alert alert-warning mb-0">Trip not found.</div>
      </PageContainer>
    );
  }

  const tripUrlId = trip.slug || trip.uid || trip.id;

  return (
    <PageContainer className="my-3">
      <header
        className="tripdetail-header mb-4"
        style={{ backgroundImage: `url(${backdrop})` }}
      >
        <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3">
          <div className="text-center flex-grow-1">
            <h1 className="h4 mb-1">{tripTitle(trip)}</h1>
            <p className="small mb-0">
              {formatDate(trip.start_date)} → {formatDate(trip.end_date)}
            </p>
            <p className="mb-0">
              {trip.city_name || "-"}, {countryNameFromCode(trip?.country_code)}
            </p>
          </div>

          <div className="d-flex flex-column flex-sm-row gap-2">
            <Link to="/dashboard" className="btn btn-secondary btn-sm">Back to Dashboard</Link>
            {trip.is_owner && (
              <>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/trips/${tripUrlId}/edit`)}>
                  Edit
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting} title="Delete trip">
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </>
            )}
          </div>
        </div>
      </header>



      <div className="row g-2 g-md-4">
        <div className="col-12 col-md-7 col-lg-7">
          <div className="row g-4">
            <div className="col-12">
              <MemberCard
                tripId={tripKey}
                members={members}
                canManage={!!trip?.is_owner}
                tripOwnerId={trip?.owner_id}
                ownerEmail={trip.owner_email}
                refreshMembers={refreshMembers}
              />
            </div>

            <div className="col-12">
              <CreateTripItem
                tripId={tripKey}
                tripStart={trip.start_date}
                tripEnd={trip.end_date}
                onCreated={refreshItems}
                defaultDate={dayFilter}
              />
            </div>

            <div className="col-12">
              <Itinerary
                start={trip.start_date}
                end={trip.end_date}
                tripId={tripKey}
                tripLat={trip.lat}
                tripLng={trip.lng}
                refreshTick={itemsVersion}
                onItemsChanged={refreshItems}
                onDayFilterChange={setDayFilter}
                onPatchedItem={(u) =>
                  setItems((prev) => {
                    let found = false;
                    const next = prev.map((it) => {
                      if (it.id === u.id) {
                        found = true;
                        return { ...it, ...u };
                      }
                      return it;
                    });
                    return found ? next : [...next, u];
                  })
                }
              />
            </div>
          </div>
        </div>

        <aside className="col-12 col-md-5 col-lg-5 col-sticky">
          <div className="sticky-map border rounded-3 overflow-hidden" style={{ minHeight: 380 }}>
            <TripMap
              apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
              items={itemsForMap}
              center={
                trip?.lat != null && trip?.lng != null
                  ? { lat: Number(trip.lat), lng: Number(trip.lng) }
                  : undefined
              }
            />
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}
