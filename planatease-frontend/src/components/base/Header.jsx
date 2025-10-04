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

    let bc;
    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel("auth");
      bc.addEventListener("message", onAuthChanged);
    }

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth-changed", onAuthChanged);
    };
  }, []);

  return (
    <header className="site-header">
      <nav className="navbar navbar-expand-lg navbar-nebula fixed-top">
        <div className="container">
          <Link className="navbar-brand d-flex align-items-center" to="/">
            <img
              src={LogoImage}
              alt="PlanAtEase Logo"
              width="42"
              height="42"
              className="brand-logo me-2"
            />
            <span className="brand-text">PlanAtEase</span>
          </Link>

          <button
            className="navbar-toggler nebula-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="nebula-bar"></span>
            <span className="nebula-bar"></span>
            <span className="nebula-bar"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-3">
              {/* About link as informational */}
              <li className="nav-item">
                <Link className="nav-link" to="/about">
                  About
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/contact">
                  Contact
                </Link>
              </li>

              {loggedIn ? (
                <>
                  <li className="nav-item">
                    <Link className="nav-link nebula-pill" to="/dashboard">
                      Dashboard
                    </Link>
                  </li>
                  <li className="nav-item">
                    <button
                      className="btn nebula-pill nebula-outline"
                      onClick={logout}
                    >
                      Log out
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li className="nav-item">
                    <Link className="nav-link nebula-pill" to="/login">
                      Login
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="btn nebula-pill nebula-solid" to="/register">
                      Register
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
}
