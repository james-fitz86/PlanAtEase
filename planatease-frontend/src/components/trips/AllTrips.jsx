import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listTrips } from "../../api/trips";

export default function AllTrips() {
  const [trips, setTrips] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listTrips();
        if (alive) setTrips(data || []);
      } catch (e) {
        if (alive) setErr(e.body?.detail || e.message || "Failed to load trips");
      }
    })();
    return () => { alive = false; };
  }, []);

  if (err) return <div className="alert alert-danger">{err}</div>;
  if (trips === null) return <p className="text-muted">Loading trips…</p>;
  if (trips.length === 0)
    return <p className="text-muted mb-0">No trips yet. Click “Create Trip” to start.</p>;

  return (
    <div className="row g-3">
      {trips.map((t) => (
        <div className="col-12 col-md-6" key={t.id}>
          <Link to={`/trips/${t.id}`} className="text-decoration-none">
            <div className="card h-100">
              <div className="card-body">
                <h5 className="card-title mb-1">
                  {t.name || t.city_name || t.formatted_address || "Trip"}
                </h5>
                <p className="card-text text-muted small mb-2">
                  {t.start_date} → {t.end_date}
                </p>
                <p className="card-text small mb-0">
                  <span className="text-muted">City:</span> {t.city_name || "-"} &nbsp;·&nbsp;
                  <span className="text-muted">Country:</span> {t.country_code || "-"}
                </p>
              </div>
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
}
