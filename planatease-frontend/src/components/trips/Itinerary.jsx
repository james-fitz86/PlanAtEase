import { useState, useMemo } from "react";

function getTripDays(start, end) {
  const days = [];
  if (!start || !end) return days;
  let cur = new Date(start);
  const last = new Date(end);
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

function ItineraryList({ days }) {
  const [openSet, setOpenSet] = useState(() => new Set());

  const toggle = (i) => {
    setOpenSet(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
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

function ItineraryCarousel({ days }) {
  const [idx, setIdx] = useState(0);
  if (!days.length) return <p className="text-muted mb-0">No days.</p>;

  const prev = () => setIdx((i) => (i - 1 + days.length) % days.length);
  const next = () => setIdx((i) => (i + 1) % days.length);

  const day = days[idx];
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
        Day {idx + 1} of {days.length}
      </div>
    </div>
  );
}

export default function Itinerary({ start, end }) {
  const days = useMemo(() => getTripDays(start, end), [start, end]);
  const [view, setView] = useState("list");

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
                <ItineraryList days={days} />
              ) : (
                <ItineraryCarousel days={days} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}