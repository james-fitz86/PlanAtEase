import { useState } from "react";
import PageContainer from "../components/base/PageContainer";

function isValidEmail(value) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  return re.test(String(value).trim());
}

const initialForm = {
  name: "",
  email: "",
  subject: "",
  message: "",
  hp: "",
};

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export default function Contact() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function validate(values) {
    const e = {};

    if (!values.name.trim()) e.name = "Please enter your name.";
    else if (values.name.trim().length > 120) e.name = "Name is too long.";

    if (!values.email.trim()) e.email = "Please enter your email.";
    else if (!isValidEmail(values.email)) e.email = "Enter a valid email address.";

    if (!values.subject.trim()) e.subject = "Please enter a subject.";
    else if (values.subject.trim().length > 200) e.subject = "Subject is too long.";

    const msg = values.message.trim();
    if (!msg) e.message = "Please enter a message.";
    else if (msg.length < 10) e.message = "Message should be at least 10 characters.";
    else if (msg.length > 5000) e.message = "Message is too long.";

    if (values.hp) e.hp = "Invalid submission.";

    return e;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (submitError) setSubmitError("");
    if (touched[name]) {
      const newErrors = validate({ ...form, [name]: value });
      setErrors(newErrors);
    }
  }

  function handleBlur(e) {
    const { name } = e.target;
    setTouched((t) => ({ ...t, [name]: true }));
    setErrors(validate(form));
  }

  function getCookie(name) {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith(name + "="))
      ?.split("=")[1];
    return cookieValue || "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    setTouched({
      name: true,
      email: true,
      subject: true,
      message: true,
      hp: true,
    });
    if (Object.keys(v).length > 0) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const csrftoken = getCookie("csrftoken");

      const res = await fetch(`${API_BASE}/api/contact/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
        credentials: "include",
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
          hp: form.hp,
        }),
      });

      if (!res.ok) {
        let detail = "Failed to send message.";
        if (res.status === 429) {
          detail = "Too many attempts. Please try again later.";
        } else if (res.status === 403) {
          detail = "Permission denied or CSRF check failed.";
        } else {
          try {
            const data = await res.json();
            detail = data?.detail || data?.error || detail;
          } catch {}
        }
        throw new Error(detail);
      }

      setSent(true);
      setForm(initialForm);
      setTouched({});
    } catch (err) {
      setSubmitError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
        <PageContainer className="my-4">
            <div className="card shadow-sm mx-auto text-center" style={{ maxWidth: 600 }}>
                <div className="card-header">
                <h1 className="h5 mb-0">Contact Us</h1>
                </div>
                <div className="card-body py-5">
                <p className="mb-4" aria-live="polite">
                    Thanks — your message has been sent. We’ll get back to you soon.
                </p>
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setSent(false)}
                >
                    Send another message
                </button>
                </div>
            </div>
        </PageContainer>
    );
  }

  return (
    <PageContainer className="my-4">
        <div className="card shadow-sm mx-auto" style={{ maxWidth: 600 }}>
        <div className="card-header d-flex justify-content-between align-items-center">
            <h1 className="h5 mb-0">Contact Us</h1>
            {sent ? (
            <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setSent(false)}
            >
                Send another
            </button>
            ) : null}
        </div>

        <div className="card-body">
            {sent ? (
            <div className="text-center py-4">
                <p className="mb-3">
                Thanks — your message has been sent. We’ll get back to you soon.
                </p>
                <button
                type="button"
                className="btn btn-primary"
                onClick={() => setSent(false)}
                >
                Send another message
                </button>
            </div>
            ) : (
            <form noValidate onSubmit={handleSubmit}>
                <div
                style={{
                    position: "absolute",
                    left: "-10000px",
                    top: "auto",
                    width: "1px",
                    height: "1px",
                    overflow: "hidden",
                }}
                >
                <label htmlFor="hp">Leave this field empty</label>
                <input
                    id="hp"
                    name="hp"
                    value={form.hp}
                    onChange={handleChange}
                />
                </div>

                <div className="mb-3">
                <label htmlFor="name" className="form-label">
                    Name
                </label>
                <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`form-control ${
                    touched.name && errors.name ? "is-invalid" : ""
                    }`}
                    placeholder="Your full name"
                />
                {touched.name && errors.name && (
                    <div className="invalid-feedback">{errors.name}</div>
                )}
                </div>

                <div className="mb-3">
                <label htmlFor="email" className="form-label">
                    Email
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`form-control ${
                    touched.email && errors.email ? "is-invalid" : ""
                    }`}
                    placeholder="you@example.com"
                />
                {touched.email && errors.email && (
                    <div className="invalid-feedback">{errors.email}</div>
                )}
                </div>

                <div className="mb-3">
                <label htmlFor="subject" className="form-label">
                    Subject
                </label>
                <input
                    id="subject"
                    name="subject"
                    type="text"
                    required
                    value={form.subject}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`form-control ${
                    touched.subject && errors.subject ? "is-invalid" : ""
                    }`}
                    placeholder="What is your message about?"
                />
                {touched.subject && errors.subject && (
                    <div className="invalid-feedback">{errors.subject}</div>
                )}
                </div>

                <div className="mb-3">
                <label htmlFor="message" className="form-label">
                    Message
                </label>
                <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={form.message}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`form-control ${
                    touched.message && errors.message ? "is-invalid" : ""
                    }`}
                    placeholder="Write your message here..."
                />
                {touched.message && errors.message && (
                    <div className="invalid-feedback">{errors.message}</div>
                )}
                </div>

                {submitError && (
                <div className="alert alert-danger py-2" role="alert">
                    {submitError}
                </div>
                )}

                <div className="d-flex flex-column flex-sm-row justify-content-between gap-2 mt-3">
                <button
                    type="reset"
                    className="btn btn-outline-secondary"
                    onClick={() => setForm(initialForm)}
                >
                    Clear
                </button>
                <button
                    type="submit"
                    disabled={submitting}
                    className={`btn ${
                    submitting ? "btn-secondary disabled" : "btn-primary"
                    }`}
                >
                    {submitting ? "Sending…" : "Send Message"}
                </button>
                </div>
            </form>
            )}
        </div>
        </div>
    </PageContainer>
  );
}
