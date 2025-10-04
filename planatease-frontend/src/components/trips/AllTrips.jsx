import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listTrips } from "../../api/trips";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function tripPath(t) {
  const ident = t.slug && /^[A-Za-z][-\w]*$/.test(t.slug) ? t.slug : t.uid || t.id;
  return `/trips/${ident}`;
}

function normalizeDateYYYYMMDD(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return new Date(y, mo - 1, d);
}

function isPastTrip(endDateStr) {
  const end = normalizeDateYYYYMMDD(endDateStr);
  if (!end) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return end < today;
}

function detectRole(t) {
  const norm = (v) => String(v ?? "").toLowerCase().trim();
  const truthy = (v) => {
    if (typeof v === "string") return ["true", "1", "yes", "y", "t", "on"].includes(v.toLowerCase().trim());
    if (typeof v === "number") return v !== 0;
    return !!v;
  };
  const take = (...vals) => vals.find((v) => v != null && v !== "");

  const roleStr = norm(
    take(
      t?.my_role,
      t?.role,
      t?.member_role,
      t?.membership?.role,
      t?.membership?.my_role,
      t?.membership?.member_role,
      t?.role_name,
      t?.membership?.role_name,
      t?.access_level,
      t?.membership?.access_level
    )
  );

  const collectPermEntries = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) {
      return val.flatMap((p) => {
        if (typeof p === "string") return [norm(p)];
        if (typeof p === "object") {
          const name = p.name || p.codename || p.key || p.id || "";
          return [norm(name)];
        }
        return [norm(String(p))];
      });
    }
    if (typeof val === "object") {
      return Object.entries(val)
        .filter(([, v]) => truthy(v))
        .map(([k]) => norm(k));
    }
    return [norm(val)];
  };

  const perms = [
    ...collectPermEntries(t?.permissions),
    ...collectPermEntries(t?.membership?.permissions),
    ...collectPermEntries(t?.my_permissions),
    ...collectPermEntries(t?.member_permissions),
    ...collectPermEntries(t?.scopes),
    ...collectPermEntries(t?.membership?.scopes),
    ...collectPermEntries(t?.caps),
    ...collectPermEntries(t?.membership?.caps),
  ];

  const deepImplies = (obj, pattern) => {
    try {
      const seen = new Set();
      const stack = [obj];
      while (stack.length) {
        const cur = stack.pop();
        if (!cur || typeof cur !== "object") continue;
        if (seen.has(cur)) continue;
        seen.add(cur);
        for (const [k, v] of Object.entries(cur)) {
          const key = norm(k);
          if (pattern.test(key) && truthy(v)) return true;
          if (typeof v === "object") stack.push(v);
          if (Array.isArray(v)) for (const it of v) if (typeof it === "object") stack.push(it);
          if (Array.isArray(v)) {
            for (const it of v) {
              if (typeof it === "string" && pattern.test(norm(it))) return true;
              if (typeof it !== "object") continue;
            }
          }
          if (typeof v === "string" && pattern.test(norm(v))) return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  const isOwner =
    truthy(t?.is_owner) ||
    truthy(t?.membership?.is_owner) ||
    roleStr === "owner" ||
    roleStr === "admin" ||
    perms.some((p) => p === "owner" || p === "admin" || p === "manage" || p.startsWith("manage")) ||
    deepImplies(t?.membership, /owner|admin|manage/);

  if (isOwner) return "owner";

  const editFlags = [
    t?.is_editor,
    t?.can_edit,
    t?.can_edit_items,
    t?.can_write,
    t?.can_update,
    t?.can_modify,
    t?.membership?.can_edit,
    t?.membership?.is_editor,
    t?.membership?.can_write,
    t?.membership?.can_update,
    t?.membership?.can_modify,
  ];

  const hasEditFlag = editFlags.some(truthy);

  const roleImpliesEdit =
    roleStr === "editor" ||
    roleStr === "edit" ||
    roleStr === "maintainer" ||
    roleStr === "contributor" ||
    roleStr === "collaborator" ||
    roleStr === "member_edit" ||
    roleStr === "editor_member";

  const permsImpliesEdit =
    perms.some(
      (p) =>
        p === "editor" ||
        p === "edit" ||
        p.startsWith("edit") ||
        p === "write" ||
        p.startsWith("write") ||
        p === "update" ||
        p.startsWith("update") ||
        p === "modify" ||
        p.startsWith("modify")
    ) || deepImplies(t, /edit|write|update|modify/);

  return hasEditFlag || roleImpliesEdit || permsImpliesEdit ? "editor" : "viewer";
}

export default function AllTrips() {
  const [trips, setTrips] = useState(null);
  const [err, setErr] = useState("");

  const [query, setQuery] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("alltrips:query")) || "";
    } catch {
      return "";
    }
  });
  const [hidePast, setHidePast] = useState(() => {
    try {
      const v = JSON.parse(localStorage.getItem("alltrips:hidePast"));
      return typeof v === "boolean" ? v : true;
    } catch {
      return true;
    }
  });
  const [roleFilter, setRoleFilter] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("alltrips:role")) || "all";
    } catch {
      return "all";
    }
  });

  useEffect(() => {
    localStorage.setItem("alltrips:query", JSON.stringify(query));
  }, [query]);
  useEffect(() => {
    localStorage.setItem("alltrips:hidePast", JSON.stringify(hidePast));
  }, [hidePast]);
  useEffect(() => {
    localStorage.setItem("alltrips:role", JSON.stringify(roleFilter));
  }, [roleFilter]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listTrips();
        if (alive) setTrips(data || []);
      } catch (e) {
        if (alive) setErr(e.body?.detail || e.message || "Failed to load trips");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const annotated = useMemo(() => {
    if (!Array.isArray(trips)) return [];
    return trips.map((t) => {
      const role = detectRole(t);
      const past = isPastTrip(t?.end_date);
      return { ...t, __role: role, __past: past };
    });
  }, [trips]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = annotated.filter((t) => {
      if (hidePast && t.__past) return false;
      if (roleFilter !== "all" && t.__role !== roleFilter) return false;
      if (!q) return true;
      const hay = [t.name, t.city_name, t.formatted_address, t.slug, t.country_code]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    arr.sort((a, b) => {
      const aPast = a.__past ? 1 : 0;
      const bPast = b.__past ? 1 : 0;
      if (aPast !== bPast) return aPast - bPast;
      const as = normalizeDateYYYYMMDD(a.start_date)?.getTime() ?? Infinity;
      const bs = normalizeDateYYYYMMDD(b.start_date)?.getTime() ?? Infinity;
      return as - bs;
    });
    return arr;
  }, [annotated, hidePast, roleFilter, query]);

  const counts = useMemo(() => {
    const total = annotated.length;
    const upcoming = annotated.filter((t) => !t.__past).length;
    return { total, upcoming };
  }, [annotated]);

  if (err) return <div className="alert alert-danger">{err}</div>;
  if (trips === null) return <p className="text-muted">Loading trips…</p>;
  if (trips.length === 0) return <p className="text-muted mb-0">No trips yet. Click “Create Trip” to start.</p>;

  return (
    <>
      <div className="card mb-3">
        <div className="card-body p-2 p-md-3">
          <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center justify-content-between gap-2">
            <div className="input-group w-100 flex-grow-1 me-md-3">
              <span className="input-group-text">Search</span>
              <input
                type="text"
                className="form-control border"
                style={{ borderWidth: "1px" }}
                placeholder="Name, city, address…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="d-flex align-items-center gap-2 flex-shrink-0 flex-wrap">
              <div className="form-check form-switch d-flex align-items-center mb-0 flex-shrink-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="hidePastSwitch"
                  checked={hidePast}
                  onChange={(e) => setHidePast(e.target.checked)}
                />
                <label className="form-check-label ms-2 text-nowrap" htmlFor="hidePastSwitch">
                  Hide past trips
                </label>
              </div>
              <div className="btn-group btn-group-sm flex-shrink-0" role="group" aria-label="Role filter">
                <button
                  type="button"
                  className={`btn ${roleFilter === "all" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setRoleFilter("all")}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`btn ${roleFilter === "owner" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setRoleFilter("owner")}
                >
                  Owner
                </button>
                <button
                  type="button"
                  className={`btn ${roleFilter === "editor" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setRoleFilter("editor")}
                >
                  Editor
                </button>
                <button
                  type="button"
                  className={`btn ${roleFilter === "viewer" ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => setRoleFilter("viewer")}
                >
                  Viewer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-2 text-muted small">
        <div>{filtered.length} trips • {counts.upcoming} upcoming</div>
        {!hidePast && <div>Showing past and upcoming</div>}
      </div>
      {filtered.length === 0 ? (
        <p className="text-muted mb-0">
          No trips match {query ? `"${query}"` : "your filters"}{roleFilter !== "all" ? ` as ${roleFilter}` : ""}{hidePast ? " with past hidden" : ""}.
        </p>
      ) : (
        <div className="row g-3">
          {filtered.map((t) => {
            const roleBadgeClass =
              t.__role === "owner" ? "bg-primary" : t.__role === "editor" ? "bg-success" : "bg-secondary";
            return (
              <div className="col-12 col-md-6" key={t.uid || t.slug || t.id}>
                <Link to={tripPath(t)} className="text-decoration-none">
                  <div className="card h-100">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <h5 className="card-title mb-0">
                          {t.name || t.city_name || t.formatted_address || "Trip"}
                        </h5>
                        <span className={`badge ${roleBadgeClass}`}>{t.__role[0].toUpperCase() + t.__role.slice(1)}</span>
                      </div>
                      <p className="card-text text-muted small mb-2 d-flex align-items-center gap-2">
                        <span>{formatDate(t.start_date)} → {formatDate(t.end_date)}</span>
                        {!hidePast && t.__past && <span className="badge bg-dark">Past</span>}
                      </p>
                      <p className="card-text small mb-0">
                        <span className="text-muted">City:</span> {t.city_name || "-"} &nbsp;·&nbsp;
                        <span className="text-muted">Country:</span> {t.country_code || "-"}
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
