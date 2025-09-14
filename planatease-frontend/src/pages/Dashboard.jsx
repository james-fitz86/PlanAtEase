import { useEffect, useState } from "react";
import { me, logout } from "../api";
import { useNavigate, Link } from "react-router-dom";
import AllTrips from "../components/trips/AllTrips";
import PageContainer from "../components/base/PageContainer";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [err, setErr] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    let ignore = false;
    me()
      .then((data) => { if (!ignore) setUser(data); })
      .catch(() => {
        setErr("Session expired. Please log in again.");
        nav("/login");
      });
    return () => { ignore = true; };
  }, [nav]);

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
                <button
                    className="btn btn-outline-secondary btn-sm"
                  >
                    Profile
                  </button>
                <Link to="/trips/create" className="btn btn-primary btn-sm">
                  Create Trip
                </Link>
              </div>
            </div>

            <div className="mt-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h2 className="h5 mb-0">My Trips</h2>
              </div>
              <AllTrips />
            </div>
          </>
        )}

        {err && <div className="alert alert-danger mt-3">{err}</div>}
      </div>
    </PageContainer>
  );
}
