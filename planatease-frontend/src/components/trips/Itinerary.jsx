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

export default function Itinerary({ start, end }) {
  const [openSet, setOpenSet] = useState(() => new Set());
  const days = useMemo(() => getTripDays(start, end), [start, end]);

  const toggle = (i) => {
    setOpenSet(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  if (!days.length) return null;

  return (
    <div className="col-12">
      <div className="row g-4">
        <div className="col-12 col-md-12">
          <div className="card h-100">
            <div className="card-body">
              <h5 className="card-title mb-3">Itinerary</h5>

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
                      <h6 className="mb-0">
                        {day.toLocaleDateString("en-IE", {
                          weekday: "long",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </h6>
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

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
