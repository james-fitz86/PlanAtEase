import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../api";
import PageContainer from "../components/base/PageContainer";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  useEffect(() => {
    const reason = localStorage.getItem("auth_logout_reason");
    if (reason === "session_max_reached") {
      setFlash("For security, please sign in again.");
      localStorage.removeItem("auth_logout_reason");
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      nav("/dashboard"); 
    } catch (err) {
      setError("Invalid email or password.");
    }
  }

  return (
    <PageContainer className="my-5">
      <div className="card shadow-sm p-4 mx-auto" style={{ maxWidth: 420 }}>
        <h1>Login</h1>
        <form onSubmit={handleSubmit} className="p-4 border rounded bg-light">
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Email address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="form-control"
            />
          </div>

          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="form-control"
            />
          </div>

          {flash && <div className="alert alert-warning">{flash}</div>}
          {error && <div className="alert alert-danger">{error}</div>}

          <button type="submit" className="btn btn-primary w-100">
            Sign in
          </button>

          <div className="text-center">
            <Link to="/password-reset">Forgot your password?</Link>
          </div>
        </form>
      </div>
    </PageContainer>
  );
}