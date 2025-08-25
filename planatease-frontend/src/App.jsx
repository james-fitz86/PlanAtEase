import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/base/Header.jsx";
import Footer from "./components/base/Footer.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import LogoutSuccess from "./pages/LogoutSuccess.jsx";
import "./App.css";

function Home() {
  return (
    <div>
      <img
        src="src/assets/images/planatease_logo.png"
        alt="PlanAtEase Logo"
        style={{ width: "600px", marginBottom: "20px" }}
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
          <Route path="/logout-success" element={<LogoutSuccess />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <Footer />
    </Router>
  );
}

