import { useState } from "react";

const API = import.meta.env.VITE_API_BASE_URL;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    try {
      const res = await fetch(`${API}/auth/users/reset_password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus("sent");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.detail || "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <section className="container my-5">
        <div className="card shadow-sm p-4 mx-auto" style={{ maxWidth: 420 }}>
          <h1 className="h4 mb-3">Check your email</h1>
          <p>
            If an account exists for <strong>{email}</strong>, you’ll receive a link to reset your password.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="container my-5">
      <div className="card shadow-sm p-4 mx-auto" style={{ maxWidth: 420 }}>
        <h1 className="h4 mb-3">Reset your password</h1>
        <p className="text-muted">Enter the email associated with your account.</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email address</label>
            <input
              id="email"
              type="email"
              className="form-control"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            {status === "loading" ? "Sending…" : "Send reset email"}
          </button>
        </form>
      </div>
    </section>
  );
}
