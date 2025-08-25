import { useEffect, useState } from "react";
import { me, logout } from "../api";
import { useNavigate } from "react-router-dom";

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
    <div style={{ maxWidth: 640, margin: "2rem auto" }}>
      <h1>Dashboard</h1>
      {user && (
        <>
          <p>Welcome, <strong>{user.full_name || user.email}</strong></p>
          <button onClick={logout}>Log out</button>
        </>
      )}
      {err && <p style={{ color: "crimson" }}>{err}</p>}
    </div>
  );
}
