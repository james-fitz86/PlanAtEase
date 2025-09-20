import { Navigate } from "react-router-dom";
import { isRestoring } from "../../auth/scheduler";

function hasAccessToken() {
  try {
    const raw = localStorage.getItem("auth");
    const tokens = raw ? JSON.parse(raw) : null;
    return !!tokens?.access;
  } catch {
    return false;
  }
}

export default function ProtectedRoute({ children }) {
  if (isRestoring()) {
    return <div style={{ padding: 16 }}>Restoring your session…</div>;
  }
  return hasAccessToken() ? children : <Navigate to="/login" replace />;
}