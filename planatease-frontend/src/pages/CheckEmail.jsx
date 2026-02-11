import { useLocation } from "react-router-dom";
import { useState } from "react";
import PageContainer from "../components/base/PageContainer";

const API = import.meta.env.VITE_API_BASE_URL;

/**
  * CheckEmail
  * Displays confirmation activation email has been sent
  * Allows users to resend activation email
  * Uses neutral success messaging to avoid revealing whether an email exists
  */

export default function CheckEmail() {

  // Used to get the current route's location
  const loc = useLocation();

  // Used to check if the email exists for resending activation email
  const [email, setEmail] = useState(loc.state?.email || "");

  // Used to track resend request state: "idle" | "loading" | "success" | "error"
  const [status, setStatus] = useState("idle");

  // Used to get and show the message: Success message | Error message | empty string
  const [message, setMessage] = useState("");

  async function handleResend(e) {
    e.preventDefault();

    // If no email given set Status to loading and message to empty string
    if (!email) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch(`${API}/auth/users/resend_activation/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // Backend returns failure and displays the error received
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || "Could not resend activation email.");
      }

      // Successful resend activation email - Shows message
      setMessage("If that email exists, a new activation link has been sent.");
      setStatus("success");
    } catch (err) {
      // Show error and allow retry
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
        
        {/* Sets email value from previous page and prefills the value */}
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

            {/* Loading state */}
            {status === "loading" ? "Resending…" : "Resend activation email"}
          </button>
        </form>
        
        {/* Displays either success or error styling based on status */}
        {message && (
          <div className={`alert mt-3 ${status === "success" ? "alert-success" : "alert-danger"}`}>
            {message}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
