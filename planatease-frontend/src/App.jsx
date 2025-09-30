import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import logo from "./assets/images/planatease_logo.png";
import Header from "./components/base/Header.jsx";
import Footer from "./components/base/Footer.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import LogoutSuccess from "./pages/LogoutSuccess.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import CreateTripPage from "./pages/trips/CreateTripPage.jsx";
import TripDetailPage from "./pages/trips/TripDetailPage.jsx";
import TripEditPage from "./pages/trips/TripEditPage.jsx";
import Profile from "./pages/Profile.jsx";
import ActivateAccount from "./pages/ActivateAccount.jsx";
import CheckEmail from "./pages/CheckEmail.jsx";
import "./App.css";

import { decodeJwt, secondsUntilExpiry } from "./auth/jwt";
import { getTokens } from "./auth/storage";
import { startAuthScheduler } from "./auth/scheduler.js";

function Home() {
  return (
    <div>
      <img
        src={logo}
        alt="PlanAtEase Logo"
        style={{ width: "100%", maxWidth:"600px", marginBottom: "20px" }}
      />
      <h1>Welcome to PlanAtEase</h1>
      <h2>Your Smart Travel Itinerary Builder</h2>
    </div>
  );
}

export default function App() {

  useEffect(() => {
    const stop = startAuthScheduler();
    return () => stop && stop();
  }, []);

  const tokens = getTokens();
  if (tokens?.access) {
    console.log("Decoded access token:", decodeJwt(tokens.access));
    console.log(
      "Seconds until expiry (with 60s leeway):",
      secondsUntilExpiry(tokens.access)
    );
  } else {
    console.log("No access token found in storage");
  }
  return (
    <Router>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={< Register />} />
          <Route path="/activate/:uid/:token" element={<ActivateAccount />} />
          <Route path="/check-email" element={<CheckEmail />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/create"
            element={
              <ProtectedRoute>
                <CreateTripPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/:tripUid"
            element={
              <ProtectedRoute>
                <TripDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/:tripUid/edit"
            element={
              <ProtectedRoute>
                <TripEditPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/:id(\d+)"
            element={
              <ProtectedRoute>
                <TripDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trips/:id(\d+)/edit"
            element={
              <ProtectedRoute>
                <TripEditPage />
              </ProtectedRoute>
            }
          />
          <Route path="/logout-success" element={<LogoutSuccess />} />
          <Route path="/password-reset" element={<ForgotPassword />} />
          <Route path="/password-reset/confirm/:uid/:token" element={<ResetPassword />} />
          <Route path="/password/change" element={<ResetPassword />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </Router>
  );
}

