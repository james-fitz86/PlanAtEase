import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import PageContainer from "../components/base/PageContainer";

const API = import.meta.env.VITE_API_BASE_URL;

/**
  * ActivateAccount
  * Handles user account activation from a link sent via email.
  * The backend provides uid + token, which are validated here.
  */

export default function ActivateAccount() {

  // Extract activation paramaters from URL
  const { uid, token } = useParams();

  // Used to redirect after a successful activation
  const nav = useNavigate();

  // Track activation state: "idle" | "loading" | "success" | "error"
  const [status, setStatus] = useState("idle");

  //stores an error message if activation fails
  const [error, setError] = useState("");

  /** handleActivate
    * Sends the uid + token to the API endpoints to verify the account.
    * Handles both success and error cases with user-facing feedback.
    */ 

  async function handleActivate() {
    setStatus("loading");
    setError("");

    try {
      const res = await fetch(`${API}/auth/users/activation/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, token }),
      });

      // Backend returns non-200 for invalid/expired activation links
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || "Activation failed.");
      }

      // Successful activation - show message then redirect
      setStatus("success");
      setTimeout(() => nav("/login"), 600);
    } catch (e) {
      // Show error and allow retry button 
      setStatus("error");
      setError(e.message);
    }
  }

  /**
    * Auto-run activation when uid + token are present
    * Ensures activation triggers immediately when user loads the page.
    */
  useEffect(() => {
    if (uid && token) handleActivate();
  }, [uid, token]);

  return (
    <PageContainer>
      <div className="container" style={{ maxWidth: 480, marginTop: "3rem" }}>
        <h1 className="mb-3">Activating your account…</h1>

        {/* Loading state */}
        {status === "loading" && <p>Please wait…</p>}

        {/* Success state */}
        {status === "success" && (
          <div className="alert alert-success">
            Account activated. Redirecting…
          </div>
        )}

        {/* Error state + retry option */}
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
