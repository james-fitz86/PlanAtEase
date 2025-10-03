import { useEffect, useState } from "react";
import { me, updateMe } from "../api";
import { useNavigate, Link } from "react-router-dom";
import PageContainer from "../components/base/PageContainer";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [err, setErr] = useState("");
  const nav = useNavigate();
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(false);
  

  useEffect(() => {let ignore = false;
    me()
      .then((data) => {
        if (ignore) return;
        setUser(data);
        setForm({
          full_name: data.full_name || "",
          email: data.email || "",
          home_location: data.home_location || "",
        });
      })
      .catch(() => {
        setErr("Session expired. Please log in again.");
        nav("/login");
      });
    return () => { ignore = true; };
  }, [nav]);

  function startEdit() {
    if (!user) return;
    setForm({
      full_name: user.full_name || "",
      email: user.email || "",
      home_location: user.home_location || "",
    });
    setEditing(true);
    setErr("");
  }

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function save() {
    try {
      const updated = await updateMe(form);
      setUser(updated);
      setEditing(false);
      setErr("");
    } catch (e) {
      const apiMsg =
        e?.response?.data?.email?.[0] ||
        e?.response?.data?.detail ||
        "Could not save changes.";
      setErr(apiMsg);
    }
  }

  function cancel() {
    setEditing(false);
    setErr("");
  }
  

  if (!user && !err) return <p style={{ padding: 24 }}>Loading…</p>;

  return (
    <PageContainer className="my-3">
      <div className="card shadow-sm p-4 mx-auto" style={{ maxWidth: 720 }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="h3 mb-0">Profile</h1>
          {!editing ? (
            <button className="btn btn-primary btn-sm" onClick={startEdit}>
              Edit
            </button>
          ) : (
            <div className="d-flex gap-2">
              <button className="btn btn-success btn-sm" onClick={save}>
                Save
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={cancel}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {err && <div className="alert alert-danger">{err}</div>}

        {!editing && user && (
          <>
            <div className="card mb-3">
              <div className="card-body">
                <h5 className="card-title mb-3">Profile Information</h5>
                <ul className="list-group mb-3">
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    <strong>Name</strong>
                    <span>{user.full_name || <span className="text-muted">Not set</span>}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    <strong>Email</strong>
                    <span>{user.email}</span>
                  </li>
                  <li className="list-group-item d-flex justify-content-between align-items-center">
                    <strong>Home Location</strong>
                    <span>{user.home_location || <span className="text-muted">Not set</span>}</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="d-flex flex-column flex-sm-row justify-content-around gap-2">
              <Link to="/password/change" className="btn btn-primary btn-sm">
                Change Password
              </Link>
              <Link to="/dashboard" className="btn btn-outline-secondary btn-sm">
                Back to Dashboard
              </Link>
            </div>
          </>
        )}

        {editing && form && (
          <div className="card">
            <div className="card-body">
              <div className="mb-3">
                <label className="form-label">Full Name</label>
                <input
                  className="form-control"
                  name="full_name"
                  value={form.full_name}
                  onChange={onChange}
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Email (sign-in)</label>
                <input
                  type="email"
                  className="form-control"
                  name="email"
                  value={form.email}
                  onChange={onChange}
                />
              </div>

              <div className="mb-0">
                <label className="form-label">Home Location</label>
                <input
                  className="form-control"
                  name="home_location"
                  value={form.home_location}
                  onChange={onChange}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
