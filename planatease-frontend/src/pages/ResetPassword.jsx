import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";

const API = import.meta.env.VITE_API_BASE_URL;

export default function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (p1 !== p2) {
      setError("Passwords do not match.");
      return;
    }
    if (!uid || !token) {
      setError("Reset link is invalid.");
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch(`${API}/auth/users/reset_password_confirm/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          token,
          new_password: p1,
          re_new_password: p2,
        }),
      });

      if (res.ok) {
        setStatus("done");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.detail || "Link invalid or expired. Please request a new reset link.");
        setStatus("error");
      }
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <section className="container my-5">
        <div className="card shadow-sm p-4 mx-auto text-center" style={{ maxWidth: 420 }}>
          <h1 className="h4 mb-3">Password updated</h1>
          <p>Your password has been reset successfully.</p>
          <button onClick={() => navigate("/login")} className="btn btn-primary">
            Go to login
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="container my-5">
      <div className="card shadow-sm p-4 mx-auto" style={{ maxWidth: 420 }}>
        <h1 className="h4 mb-3">Choose a new password</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="pw1" className="form-label">New password</label>
            <input
              id="pw1"
              type="password"
              className="form-control"
              autoComplete="new-password"
              placeholder="New password"
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="pw2" className="form-label">Confirm new password</label>
            <input
              id="pw2"
              type="password"
              className="form-control"
              autoComplete="new-password"
              placeholder="Confirm new password"
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              required
            />
          </div>

          {status === "error" && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={status === "loading"}
          >
            {status === "loading" ? "Resetting…" : "Reset password"}
          </button>
        </form>
      </div>
    </section>
  );
}
