import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useMemo } from "react";
import PageContainer from "../components/base/PageContainer";

const API = import.meta.env.VITE_API_BASE_URL;
const STORAGE_KEY = "auth";

function getAccessToken() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw).access : null;
  } catch {
    return null;
  }
}

export default function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const isResetFlow = useMemo(() => Boolean(uid && token), [uid, token]);
  const [currentPw, setCurrentPw] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  function handleBlur(e) {
    const { id, value } = e.target;
    if (!value.trim()) {
      setError("All fields are required.");
      return;
    }
    if ((id === "pw1" || id === "pw2") && p1 && p2 && p1 !== p2) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!p1 || !p2 || (!isResetFlow && !currentPw)) {
      setError("All fields are required.");
      return;
    }
    if (p1 !== p2) {
      setError("Passwords do not match.");
      return;
    }
    if (isResetFlow && (!uid || !token)) {
      setError("Reset link is invalid.");
      return;
    }
    if (!isResetFlow) {
      const access = getAccessToken();
      if (!access) {
        setError("You’re not logged in. Please log in again and retry.");
        return;
      }
    }

    setStatus("loading");

    try {
      const url = isResetFlow
        ? `${API}/auth/users/reset_password_confirm/`
        : `${API}/auth/users/set_password/`;

      const body = isResetFlow
        ? { uid, token, new_password: p1, re_new_password: p2 }
        : { current_password: currentPw, new_password: p1, re_new_password: p2 };

      const headers = {
        "Content-Type": "application/json",
        ...(isResetFlow
          ? {}
          : (() => {
              const access = getAccessToken();
              return access ? { Authorization: `Bearer ${access}` } : {};
            })()),
      };

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setStatus("done");
      } else {
        const data = await res.json().catch(() => ({}));
        const fallback = isResetFlow
          ? "Link invalid or expired. Please request a new reset link."
          : "Could not change password. Check your current password and try again.";
        const msg =
          data?.detail ||
          data?.non_field_errors?.[0] ||
          data?.new_password?.[0] ||
          data?.current_password?.[0] ||
          fallback;
        setError(msg);
        setStatus("error");
      }
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <PageContainer className="my-5">
        <div className="card shadow-sm p-4 mx-auto text-center" style={{ maxWidth: 420 }}>
          <h1 className="h4 mb-3">
            {isResetFlow ? "Password updated" : "Password changed"}
          </h1>
          <p>
            {isResetFlow
              ? "Your password has been reset successfully."
              : "Your password has been changed successfully."}
          </p>
          <button
            onClick={() => navigate(isResetFlow ? "/login" : "/profile")}
            className="btn btn-primary"
          >
            {isResetFlow ? "Go to login" : "Back to profile"}
          </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="my-5">
      <div className="card shadow-sm p-4 mx-auto" style={{ maxWidth: 420 }}>
        <h1 className="h4 mb-3">
          {isResetFlow ? "Choose a new password" : "Change your password"}
        </h1>
        <form onSubmit={handleSubmit}>
          {!isResetFlow && (
            <div className="mb-3">
              <label htmlFor="cpw" className="form-label">Current password</label>
              <input
                id="cpw"
                type="password"
                className="form-control"
                autoComplete="current-password"
                placeholder="Current password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                onBlur={handleBlur}
                required
              />
            </div>
          )}

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
              onBlur={handleBlur}
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
              onBlur={handleBlur}
              required
            />
          </div>

          {status === "error" && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <div className="d-flex flex-column flex-sm-row gap-2">
            {!isResetFlow && (
              <Link to="/profile" className="btn btn-outline-secondary">
                Cancel
              </Link>
            )}
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={status === "loading"}
            >
              {status === "loading"
                ? (isResetFlow ? "Resetting…" : "Saving…")
                : (isResetFlow ? "Reset password" : "Change password")}
            </button>
          </div>
        </form>
      </div>
    </PageContainer>
  );
}
