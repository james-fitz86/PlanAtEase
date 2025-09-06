import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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

import "./App.css";

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
  return (
    <Router>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={< Register />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
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
            path="/trips/:id"
            element={
              <ProtectedRoute>
                <TripDetailPage />
              </ProtectedRoute>
            }
          />
          <Route path="/logout-success" element={<LogoutSuccess />} />
          <Route path="/password-reset" element={<ForgotPassword />} />
          <Route path="/password-reset/confirm/:uid/:token" element={<ResetPassword />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </Router>
  );
}

