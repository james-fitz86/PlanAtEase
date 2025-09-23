import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getTrip, listTripMembers, deleteTrip, listTripItems } from "../../api/trips";
import MemberCard from "../../components/trips/MemberCard";
import Itinerary from "../../components/trips/Itinerary";
import CreateTripItem from "../../components/trips/CreateTripItem";
import PageContainer from "../../components/base/PageContainer";
import { countryNameFromCode } from "../../utils/geo";
import TripMap from "../../components/trips/TripMap";

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

  if (name && city && name.toLowerCase() !== city.toLowerCase()) {
    return name;
  }
  if (city) return `Trip to ${city}`;
  if (formatted) return formatted;
  return "Trip";
}

export default function TripDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [itemsVersion, setItemsVersion] = useState(0);
  const [items, setItems] = useState([]);

  async function refreshMembers() {
    try {
      const m = await listTripMembers(id);
      setMembers(m);
    } catch (e) {
      console.error("Failed to refresh members", e);
    }
  }

  function refreshItems() {
    setItemsVersion((v) => v + 1);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listTripItems(id);
        if (!alive) return;
        setItems(Array.isArray(data) ? data : []);
        console.log("Trip items loaded:", data?.length ?? 0, data);
      } catch (e) {
        console.error("Failed to load trip items", e);
      }
    })();
    return () => { alive = false; };
  }, [id, itemsVersion]);


  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [t, m] = await Promise.all([getTrip(id), listTripMembers(id)]);
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
  }, [id]);

  async function handleDelete() {
    if (!trip || deleting) return;
    const ok = window.confirm("Delete this trip? This cannot be undone.");
    if (!ok) return;

    try {
      setDeleting(true);
      await deleteTrip(trip.id);
      navigate("/dashboard");
    } catch (e) {
      setDeleting(false);
      alert(e.body?.detail || e.message || "Failed to delete trip");
    }
  }

  if (loading) {
    return <div className="p-6">Loading…</div>;
  }
  if (err) {
    return <div className="p-6 text-red-600">{err}</div>;
  }
  if (!trip) {
    return <div className="p-6">Trip not found.</div>;
  }

  return (
    <PageContainer className="my-3">
      <header className="mb-4">
          <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3">
            <div className="text-center flex-grow-1">
              <h1 className="h4 mb-1">{tripTitle(trip)}</h1>
              <p className="text-muted small mb-0">
                  {formatDate(trip.start_date)} → {formatDate(trip.end_date)}
              </p>
              <p>{trip.city_name || "-"}, {countryNameFromCode(trip?.country_code)}</p>
            </div>
            
            <div className="d-flex flex-column flex-sm-row gap-2">
              <Link to="/dashboard" className="btn btn-outline-secondary btn-sm">
                Back to Dashboard
              </Link>
                {trip.is_owner && (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate(`/trips/${trip.id}/edit`)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={handleDelete}
                      disabled={deleting}
                      title="Delete trip"
                    >
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
                tripId={id}
                members={members}
                canManage={!!trip?.is_owner}
                tripOwnerId={trip?.owner_id}
                ownerEmail={trip.owner_email}
                refreshMembers={refreshMembers}
              />
            </div>

            <div className="col-12">
              <CreateTripItem
                tripId={trip.id}
                tripStart={trip.start_date}
                tripEnd={trip.end_date}
                onCreated={refreshItems}
              />
            </div>
            
            <Itinerary
              start={trip.start_date}
              end={trip.end_date}
              tripId={trip.id}
              refreshTick={itemsVersion}
              onItemsChanged={refreshItems}
            />

          </div>
        </div>

        <aside className="col-12 col-md-5 col-lg-5 col-sticky">
          <div className="sticky-map border rounded-3 overflow-hidden" style={{ minHeight: 380 }}>
            <TripMap
              apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
              items={items}
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
