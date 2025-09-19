import { useLocation } from "react-router-dom";
import { useState } from "react";
import PageContainer from "../components/base/PageContainer";

const API = import.meta.env.VITE_API_BASE_URL;

export default function CheckEmail() {
  const loc = useLocation();
  const [email, setEmail] = useState(loc.state?.email || "");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function handleResend(e) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch(`${API}/auth/users/resend_activation/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || "Could not resend activation email.");
      }
      setMessage("If that email exists, a new activation link has been sent.");
      setStatus("success");
    } catch (err) {
      setMessage(err.message);
      setStatus("error");
    }
  }

  return (
    <PageContainer>
      <div className="container" style={{ maxWidth: 520, marginTop: "3rem" }}>
        <h1 className="mb-3">Check your email</h1>
        <p className="mb-4">
          We’ve sent an activation link to your email. Click it to activate your account.
        </p>

        <form onSubmit={handleResend} className="p-3 border rounded bg-light">
          <div className="mb-3">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <button className="btn btn-outline-primary" disabled={status === "loading"}>
            {status === "loading" ? "Resending…" : "Resend activation email"}
          </button>
        </form>

        {message && (
          <div className={`alert mt-3 ${status === "success" ? "alert-success" : "alert-danger"}`}>
            {message}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
