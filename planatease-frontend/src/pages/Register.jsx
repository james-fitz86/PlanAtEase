import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../api";
import PageContainer from "../components/base/PageContainer";

export default function Register() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    password: "",
    password2: "",
  });
  const [error, setError] = useState("");

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  function handleBlur(e) {
    const { name, value } = e.target;
    if (!value.trim()) {
      setError(`${name.replace("_", " ")} is required.`);
      return;
    }
    if (name === "email" && !isValidEmail(value)) {
      setError("Please enter a valid email address.");
      return;
    }
    if ((name === "password2" || name === "password") && form.password2 && form.password !== form.password2) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.email || !form.full_name || !form.password || !form.password2) {
      setError("All fields are required.");
      return;
    }
    if (!isValidEmail(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (form.password !== form.password2) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await register(form);
      nav("/check-email", { state: { email: form.email } });
    } catch (err) {
      setError(
        JSON.stringify(err.response?.data) || "Registration failed, try again."
      );
    }
  };

  return (
    <PageContainer className="my-5">
      <div className="card shadow-sm p-4 mx-auto" style={{ maxWidth: 500 }}>
        <h1 className="mb-4">Register</h1>
        <form onSubmit={handleSubmit} className="p-4 border rounded bg-light">
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Email address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-control"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="email"
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="full_name" className="form-label">
              Full Name
            </label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              className="form-control"
              value={form.full_name}
              onChange={handleChange}
              onBlur={handleBlur}
              required
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
              className="form-control"
              value={form.password}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="password2" className="form-label">
              Confirm Password
            </label>
            <input
              type="password"
              id="password2"
              name="password2"
              className="form-control"
              value={form.password2}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="new-password"
              required
            />
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <button type="submit" className="btn btn-primary w-100">
            Register
          </button>
        </form>
      </div>
    </PageContainer>
  );
}
