import { useState, useMemo, useEffect } from "react";
import { listTripItems, deleteTripItem } from "../../api/trips";


function parseLocalDate(d) {
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day);
  }
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function ymdLocal(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTripDays(start, end) {
  const s = parseLocalDate(start);
  const e = parseLocalDate(end);
  if (!s || !e) return [];

  const [from, to] = s <= e ? [s, e] : [e, s];

  const days = [];
  let cur = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const last = new Date(to.getFullYear(), to.getMonth(), to.getDate());

  while (cur <= last) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function DayLabel({ day }) {
  return (
    <span>
      {day.toLocaleDateString("en-IE", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      })}
    </span>
  );
}

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue];
}

function formatTime(t) {
  if (!t) return "";
  return t.slice(0, 5);
}


function ItemRow({ it, onDeleted }) {
  const rowKey = `itemrow:${it.trip_id ?? "trip"}:${it.id}`;
  const [open, setOpen] = useLocalStorage(rowKey, false);

  const toggle = () => setOpen((v) => !v);

  const time =
    it.start_time && it.end_time
      ? `${formatTime(it.start_time)}–${formatTime(it.end_time)}`
      : it.start_time
      ? `${formatTime(it.start_time)}`
      : "";

  const label = it.item_type_label || it.item_type;
  const title = it.title?.trim() || it.place_name;
  const description = it.description

  const labelColors = {
    Flight: "bg-flight",
    Accommodation: "bg-accommodation",
    Restaurant: "bg-restaurant",
    Transport: "bg-transport",
    Activity: "bg-activity",
    Sightseeing: "bg-sightseeing"
  };

  const [deleting, setDeleting] = useState(false);

  async function handleDeleteItem() {
  if (deleting) return;
  const ok = window.confirm("Delete this item? This cannot be undone.");
  if (!ok) return;

  try {
    setDeleting(true);
    await deleteTripItem(it.trip_id, it.id);
    onDeleted?.(it.id);
  } catch (e) {
    alert(e.body?.detail || e.message || "Failed to delete item");
    setDeleting(false);
  }
}

  return (
    <div className="d-flex align-items-start gap-3 py-1">
      <span
        className={`badge text-wrap fixed-label ${labelColors[label] || "bg-secondary"}`}
      >
        {label}
      </span>

      <div className="flex-grow-1">
        <div className="d-flex justify-content-between align-items-center">
          <strong>{title}</strong>
          <div className="d-flex align-items-center gap-2">
            {time && <small className="text-muted">{time}</small>}
            <button
              type="button"
              className="btn btn-sm btn-light p-0 px-2"
              onClick={toggle}
              aria-expanded={open}
              aria-label={open ? "Collapse details" : "Expand details"}
            >
              {open ? "−" : "+"}
            </button>
          </div>
        </div>
        {open && (
          <div className="mt-1 text-muted small">
            {description && <p className="mb-2">{description}</p>}

            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
              >
                Edit
              </button>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={handleDeleteItem}
                disabled={deleting}
                title="Delete item"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function ItineraryList({ days, itemsByDate, storageKey, onItemDeleted }) {
  const [openArray, setOpenArray] = useLocalStorage(`${storageKey}:openSet`, []);
  const openSet = useMemo(() => new Set(openArray), [openArray]);

  useEffect(() => {
    const valid = openArray.filter((i) => i < days.length);
    if (valid.length !== openArray.length) {
      setOpenArray(valid);
    }
  }, [days.length, openArray, setOpenArray]);

  const toggle = (i) => {
    const next = new Set(openSet);
    next.has(i) ? next.delete(i) : next.add(i);
    setOpenArray([...next]);
  };

  if (!days.length) return <p className="text-muted mb-0">No days.</p>;

  return (
    <>
      {days.map((day, i) => {
        const key = ymdLocal(day);
        const items = itemsByDate.get(key) || [];
        const isOpen = openSet.has(i);
        return (
          <div key={key} className="mb-3 border rounded">
            <button
              type="button"
              className="w-100 d-flex justify-content-between align-items-center p-2 btn text-start"
              onClick={() => toggle(i)}
            >
              <h6 className="mb-0"><DayLabel day={day} /></h6>
              <span className={`ms-2 chevron ${isOpen ? "rotate-90" : ""}`}>▸</span>
            </button>
            {isOpen && (
              <div className="p-2 border-top text-start">
                {items.length === 0 ? (
                  <p className="text-muted small mb-0">No items for this day.</p>
                ) : (
                  items.map((it) => (
                    <ItemRow
                      key={it.id}
                      it={it}
                      onDeleted={(id) => onItemDeleted(key, id)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}


function ItineraryCarousel({ days, itemsByDate, storageKey, onItemDeleted }) {
  const [idx, setIdx] = useLocalStorage(`${storageKey}:idx`, 0);

  if (!days.length) return <p className="text-muted mb-0">No days.</p>;

  const safeIdx = Math.min(Math.max(Number.isFinite(idx) ? idx : 0, 0), days.length - 1);

  useEffect(() => {
    if (idx !== safeIdx) setIdx(safeIdx);
  }, [idx, safeIdx, setIdx]);

  const prev = () => setIdx((i) => (i - 1 + days.length) % days.length);
  const next = () => setIdx((i) => (i + 1) % days.length);

  const day = days[safeIdx];
  const key = ymdLocal(day);
  const items = itemsByDate.get(key) || [];

  return (
    <div className="border rounded">
      <div className="d-flex align-items-center justify-content-between p-2 border-bottom">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={prev}
          aria-label="Previous day"
        >
          ◂
        </button>
        <h6 className="mb-0 text-center"><DayLabel day={day} /></h6>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={next}
          aria-label="Next day"
        >
          ▸
        </button>
      </div>
      <div key={key} className="p-3 text-start">
        {items.length === 0 ? (
          <p className="text-muted small mb-0">No items for this day.</p>
        ) : (
          items.map((it) => (
            <ItemRow
              key={it.id}
              it={it}
              onDeleted={(id) => onItemDeleted(key, id)}
            />
          ))
        )}
      </div>
      <div className="px-3 py-2 text-center text-muted small border-top">
        Day {safeIdx + 1} of {days.length}
      </div>
    </div>
  );
}


export default function Itinerary({ start, end, tripId, refreshTick = 0 }) {
  if (!tripId) return null;

  const days = useMemo(() => getTripDays(start, end), [start, end]);
  const storageKey = `itinerary:${tripId}`;
  const [view, setView] = useLocalStorage(`${storageKey}:view`, "list");

  const [itemsByDate, setItemsByDate] = useState(() => new Map());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const handleItemDeleted = (dateKey, itemId) => {
    setItemsByDate((prev) => {
      const next = new Map(prev);
      const arr = next.get(dateKey) || [];
      next.set(dateKey, arr.filter((x) => x.id !== itemId));
      return next;
    });
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const data = await listTripItems(tripId);
        const items = Array.isArray(data?.results) ? data.results : data || [];

        const map = new Map();
        for (const it of items) {
          const d = it.date;
          if (!d) continue;
          if (!map.has(d)) map.set(d, []);
          map.get(d).push(it);
        }

        for (const [k, arr] of map) {
          arr.sort((a, b) => {
            const at = a.start_time || "";
            const bt = b.start_time || "";
            if (at < bt) return -1;
            if (at > bt) return 1;
            const ai = a.item_type || "";
            const bi = b.item_type || "";
            if (ai < bi) return -1;
            if (ai > bi) return 1;
            const ap = (a.place_name || "").toLowerCase();
            const bp = (b.place_name || "").toLowerCase();
            if (ap < bp) return -1;
            if (ap > bp) return 1;
            return 0;
          });
        }

        if (alive) setItemsByDate(map);
      } catch (e) {
        if (alive) setErr(e.body?.detail || e.message || "Failed to load trip items");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tripId, refreshTick]);

  return (
    <div className="col-12">
      <div className="row g-4">
        <div className="col-12 col-md-12">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">Itinerary</h5>
                <div className="btn-group btn-group-sm" role="group" aria-label="Itinerary view">
                  <button
                    type="button"
                    className={`btn ${view === "list" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setView("list")}
                  >
                    List View
                  </button>
                  <button
                    type="button"
                    className={`btn ${view === "day" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => setView("day")}
                  >
                    Day View
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="d-flex align-items-center gap-2">
                  <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></div>
                  <span className="text-muted">Loading items…</span>
                </div>
              ) : err ? (
                <div className="alert alert-warning mb-0">{err}</div>
              ) : view === "list" ? (
                <ItineraryList days={days} itemsByDate={itemsByDate} storageKey={storageKey} onItemDeleted={handleItemDeleted} />
              ) : (
                <ItineraryCarousel days={days} itemsByDate={itemsByDate} storageKey={storageKey} onItemDeleted={handleItemDeleted} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
