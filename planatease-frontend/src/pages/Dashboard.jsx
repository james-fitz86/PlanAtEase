import { useEffect, useState } from "react";
import { me } from "../api";
import { useNavigate, Link } from "react-router-dom";
import AllTrips from "../components/trips/AllTrips";
import PageContainer from "../components/base/PageContainer";
import { transferGuestTrips } from "../api/guest_transfer";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [err, setErr] = useState("");
  const [importedCount, setImportedCount] = useState(0);
  const [tripsTick, setTripsTick] = useState(0);
  const nav = useNavigate();

  useEffect(() => {
    let ignore = false;
    me()
      .then((data) => {
        if (!ignore) setUser(data);
      })
      .catch(() => {
        setErr("Session expired. Please log in again.");
        nav("/login");
      });
    return () => {
      ignore = true;
    };
  }, [nav]);

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    (async () => {
      try {
        const res = await transferGuestTrips();
        if (ignore) return;
        const count = Array.isArray(res?.transferred) ? res.transferred.length : 0;
        if (count > 0) {
          setImportedCount(count);
          setTripsTick((t) => t + 1);
        }
      } catch {}
    })();
    return () => {
      ignore = true;
    };
  }, [user]);

  if (!user && !err) return <p style={{ padding: 24 }}>Loading…</p>;

  return (
    <PageContainer className="my-3">
      <div className="mx-auto w-100" style={{ maxWidth: 720 }}>
        <h1 className="h3 mb-3">Dashboard</h1>

        {user && (
          <>
            <div className="alert alert-light d-flex justify-content-between align-items-center">
              <span>
                Welcome, <strong>{user.full_name || user.email}</strong>
              </span>
              <div className="d-flex gap-2">
                <Link to="/profile" className="btn btn-outline-secondary btn-sm">
                  Profile
                </Link>
                <Link to="/trips/create" className="btn btn-primary btn-sm">
                  Create Trip
                </Link>
              </div>
            </div>

            {importedCount > 0 && (
              <div className="alert alert-success">
                Imported {importedCount} trip{importedCount === 1 ? "" : "s"} from your guest session.
              </div>
            )}

            <div className="mt-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h2 className="h5 mb-0">My Trips</h2>
              </div>
              <AllTrips key={tripsTick} />
            </div>
          </>
        )}

        {err && <div className="alert alert-danger mt-3">{err}</div>}
      </div>
    </PageContainer>
  );
}
