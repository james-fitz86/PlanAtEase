import { Link } from "react-router-dom";
import LogoImage from "../../assets/images/favicon.png";
import { useEffect, useState } from "react";
import { logout } from "../../api";

function isLoggedInFromStorage() {
  try {
    const raw = localStorage.getItem("auth");
    const tokens = raw ? JSON.parse(raw) : null;
    return !!tokens?.access;
  } catch {
    return false;
  }
}

export default function Header() {
  const [loggedIn, setLoggedIn] = useState(isLoggedInFromStorage());

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "auth") setLoggedIn(isLoggedInFromStorage());
    };
    window.addEventListener("storage", onStorage);

    const onAuthChanged = () => setLoggedIn(isLoggedInFromStorage());
    window.addEventListener("auth-changed", onAuthChanged);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth-changed", onAuthChanged);
    };
  }, []);

  return (
    <header className="site-header">
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container">
          <Link className="navbar-brand d-flex align-items-center" to="/">
            <img
              src={LogoImage}
              alt="PlanAtEase Logo"
              width="50"
              height="50"
              className="d-inline-block align-text-top me-2"
            />
            PlanAtEase
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <div className="navbar-nav ms-auto">
              {loggedIn ? (
                <>
                <Link className="nav-item nav-link" to="/dashboard">
                  Dashboard
                </Link>
                <button
                  className="nav-item nav-link"
                  onClick={logout}
                >
                  Log out
                </button>
              </>
            ) : (
                <>
                  <Link className="nav-item nav-link" to="/login">
                    Login
                  </Link>
                  <Link className="nav-item nav-link" to="/register">
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
