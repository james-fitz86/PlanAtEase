import { useState, useMemo, useEffect } from "react";

function parseISO(d) {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function getTripDays(start, end) {
  const s = parseISO(start);
  const e = parseISO(end);
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
    } catch {
    }
  }, [key, value]);

  return [value, setValue];
}

function ItineraryList({ days, storageKey }) {
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
        const key = day.toISOString().slice(0, 10);
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
                <p className="text-muted small mb-0">Activities go here...</p>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function ItineraryCarousel({ days, storageKey }) {
  const [idx, setIdx] = useLocalStorage(`${storageKey}:idx`, 0);

  if (!days.length) return <p className="text-muted mb-0">No days.</p>;

  const safeIdx = Math.min(Math.max(Number.isFinite(idx) ? idx : 0, 0), days.length - 1);

  useEffect(() => {
    if (idx !== safeIdx) setIdx(safeIdx);
  }, [idx, safeIdx, setIdx]);

  

  const prev = () => setIdx((i) => (i - 1 + days.length) % days.length);
  const next = () => setIdx((i) => (i + 1) % days.length);

  const day = days[safeIdx];
  const key = day.toISOString().slice(0, 10);

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
        <p className="text-muted small mb-0">Activities for this day go here...</p>
      </div>
      <div className="px-3 py-2 text-center text-muted small border-top">
        Day {safeIdx + 1} of {days.length}
      </div>
    </div>
  );
}

export default function Itinerary({ start, end, tripId }) {
  if (!tripId) return null;

  const days = useMemo(() => getTripDays(start, end), [start, end]);

  const storageKey = `itinerary:${tripId}`;

  const [view, setView] = useLocalStorage(`${storageKey}:view`, "list");;

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

              {view === "list" ? (
                <ItineraryList days={days} storageKey={storageKey} />
              ) : (
                <ItineraryCarousel days={days} storageKey={storageKey} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}