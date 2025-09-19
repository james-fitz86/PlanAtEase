import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import PageContainer from "../components/base/PageContainer";

const API = import.meta.env.VITE_API_BASE_URL;

export default function ActivateAccount() {
  const { uid, token } = useParams();
  const nav = useNavigate();
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function handleActivate() {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch(`${API}/auth/users/activation/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, token }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || "Activation failed.");
      }
      setStatus("success");
      setTimeout(() => nav("/login"), 600);
    } catch (e) {
      setStatus("error");
      setError(e.message);
    }
  }

  useEffect(() => {
    if (uid && token) handleActivate();
  }, [uid, token]);

  return (
    <PageContainer>
      <div className="container" style={{ maxWidth: 480, marginTop: "3rem" }}>
        <h1 className="mb-3">Activating your account…</h1>
        {status === "loading" && <p>Please wait…</p>}
        {status === "success" && (
          <div className="alert alert-success">
            Account activated. Redirecting…
          </div>
        )}
        {status === "error" && (
          <>
            <div className="alert alert-danger">{error}</div>
            <button className="btn btn-primary" onClick={handleActivate}>
              Retry activation
            </button>
          </>
        )}
      </div>
    </PageContainer>
  );
}
