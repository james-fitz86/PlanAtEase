import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getTrip, listTripMembers, deleteTrip } from "../../api/trips";
import MemberCard from "../../components/trips/MemberCard";

export default function TripDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function refreshMembers() {
    try {
      const m = await listTripMembers(id);
      setMembers(m);
    } catch (e) {
      console.error("Failed to refresh members", e);
    }
  }

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
    <div className="container my-4">
      <header className="d-flex justify-content-between align-items-center mb-4">
          <div>
          <h1 className="h4 mb-1">
              {trip.name || trip.city_name || trip.formatted_address || "Trip"}
          </h1>
          <p className="text-muted small mb-0">
              {trip.start_date} → {trip.end_date}
          </p>
          </div>
          <Link to="/dashboard" className="btn btn-outline-secondary btn-sm">
          Back to Dashboard
          </Link>
          {trip.is_owner && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={handleDelete}
              disabled={deleting}
              title="Delete trip"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
      </header>

      <div className="row g-4">
          <div className="col-12 col-md-6">
            <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title mb-3">Location</h5>
                  <dl className="row mb-0 small">
                      <dt className="col-4 text-muted">City</dt>
                      <dd className="col-8">{trip.city_name || "-"}</dd>

                      <dt className="col-4 text-muted">Country</dt>
                      <dd className="col-8">{trip.country_code || "-"}</dd>
                  </dl>
                </div>
            </div>
          </div>

          <div className="col-12 col-md-6">
            <MemberCard
              tripId={id}
              members={members}
              canManage={!!trip?.is_owner}
              tripOwnerId={trip?.owner_id}
              refreshMembers={refreshMembers}
            />
          </div>
      </div>
    </div>
  );
}
