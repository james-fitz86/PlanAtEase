import { Link } from "react-router-dom";
import LogoImage from "../../assets/images/favicon.png";

export default function Header() {
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
              <Link className="nav-item nav-link" to="/login">
                Login
              </Link>
              <Link className="nav-item nav-link" to="/register">
                Register
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
