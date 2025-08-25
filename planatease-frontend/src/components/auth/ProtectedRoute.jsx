import { Navigate } from "react-router-dom";

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
  return hasAccessToken() ? children : <Navigate to="/login" replace />;
}