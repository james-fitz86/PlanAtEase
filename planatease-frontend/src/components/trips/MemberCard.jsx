import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addTripMember, removeTripMember } from "../../api/trips";

function currentUserIdFromJWT() {
  try {
    const raw = localStorage.getItem("auth");
    const tokens = raw ? JSON.parse(raw) : null;
    const access = tokens?.access;
    if (!access) return null;
    const payload = JSON.parse(
      atob(access.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    const id = payload.user_id ?? payload.user ?? payload.sub ?? null;
    return id == null ? null : Number(id);
  } catch {
    return null;
  }
}

export default function MembersCard({
  tripId,
  members,
  canManage,
  tripOwnerId,
  refreshMembers,
}) {
  const [form, setForm] = useState({ email: "", role: "viewer" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState(null);
  const navigate = useNavigate();
  const meId = currentUserIdFromJWT();
  const ownerIdNum = tripOwnerId == null ? null : Number(tripOwnerId);

  async function handleAdd(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await addTripMember(tripId, { email: form.email, role: form.role });
      setForm({ email: "", role: "viewer" });
      refreshMembers?.();
      const modalEl = document.getElementById("addMemberModal");
      const modal =
        window.bootstrap?.Modal.getInstance(modalEl) ||
        new window.bootstrap.Modal(modalEl);
      modal.hide();
    } catch (err) {
      const msg = err.body?.email?.[0] || err.body?.detail || "Failed to add member";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(userId) {
    setRemovingId(userId);
    try {
      await removeTripMember(tripId, userId);
      if (meId != null && userId === meId) {
        navigate("/dashboard");
        return;
      }
      refreshMembers?.();
    } catch (err) {
      alert(err.body?.detail || err.message || "Failed to remove member");
    } finally {
      setRemovingId((id) => (id === userId ? null : id));
    }
  }

  const getUid = (m) => {
    const raw = m.user_id ?? m.user ?? m.userId ?? (m.user && m.user.id);
    return raw == null ? null : Number(raw);
  };

  return (
    <div className="card h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="card-title mb-0">Members</h5>
          {canManage && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              data-bs-toggle="modal"
              data-bs-target="#addMemberModal"
            >
              Add member
            </button>
          )}
        </div>

        {members.length === 0 ? (
          <p className="text-muted small mb-0">Only you (owner).</p>
        ) : (
          <ul className="list-unstyled small mb-0">
            {members.map((m) => {
              const uid = getUid(m);
              const isMe = meId != null && uid != null && uid === meId;
              const isOwnerRow = ownerIdNum != null && uid === ownerIdNum;
              const isRowBusy = removingId === uid;

              return (
                <li key={m.id} className="d-flex justify-content-between py-1">
                  <span>{m.user_email}</span>
                  <span className="text-muted d-flex gap-2 align-items-center">
                    {m.role}
                    {canManage && uid != null && !isOwnerRow && (
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-danger p-0"
                        disabled={isRowBusy}
                        onClick={() => handleRemove(uid)}
                      >
                        {isRowBusy ? "Removing…" : "Remove"}
                      </button>
                    )}
                    {!canManage && isMe && (
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-danger p-0"
                        disabled={isRowBusy}
                        onClick={() => handleRemove(uid)}
                      >
                        {isRowBusy ? "Leaving…" : "Leave"}
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="modal fade" id="addMemberModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog">
          <form className="modal-content" onSubmit={handleAdd}>
            <div className="modal-header">
              <h5 className="modal-title">Add member</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Member email</label>
                <input
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
              </div>
              {error && <div className="alert alert-danger py-2">{error}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Adding…" : "Add"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
