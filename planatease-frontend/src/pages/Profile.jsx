import { useEffect, useState } from "react";
import { me} from "../api";
import { useNavigate, Link } from "react-router-dom";
import PageContainer from "../components/base/PageContainer";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [err, setErr] = useState("");
  const nav = useNavigate();
  

  useEffect(() => {let ignore = false;
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
        <h1 className="h3 mb-3">Profile</h1>

        {user && (
          <>
            <div className="alert alert-light d-flex justify-content-between align-items-center">
                <p>Name: {user.full_name}</p>
                <p>Email:{user.email}</p>
                <p>Home Location: {user.home_location}</p>
                
                <Link to="/password/change"  className="btn btn-primary btn-sm">
                    Change Password
                </Link>
            </div>
                
            <div>
                <Link to="/dashboard" className="btn btn-outline-secondary btn-sm">
                    Back to Dashboard
                </Link>
            </div>
          </>
        )}

        {err && <div className="alert alert-danger mt-3">{err}</div>}
      </div>
    </PageContainer>
  );
}