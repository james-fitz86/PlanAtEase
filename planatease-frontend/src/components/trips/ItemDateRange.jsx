import { useEffect } from "react";

export default function ItemDateRange({
  startDate,
  endDate,
  minDate,
  maxDate,
  onChange,
  labelStart = "Start date",
  labelEnd = "End date",
}) {
  const clamp = (d) => {
    if (!d) return d;
    if (minDate && d < minDate) return minDate;
    if (maxDate && d > maxDate) return maxDate;
    return d;
  };

  useEffect(() => {
    let s = clamp(startDate);
    let e = clamp(endDate);

    if (s && e && s > e) {
      e = s;
    }

    if (s !== startDate || e !== endDate) {
      onChange({ startDate: s, endDate: e });
    }
  }, [minDate, maxDate]);

  const handleStart = (val) => {
    const s = clamp(val);
    let e = clamp(endDate);

    if (!e || (s && e < s)) {
      onChange({ startDate: s, endDate: s || e || "" });
    } else {
      onChange({ startDate: s, endDate: e });
    }
  };

  const handleEnd = (val) => {
    let e = clamp(val);
    const s = clamp(startDate);

    if (s && e && e < s) e = s;

    onChange({ startDate: s, endDate: e });
  };

  return (
    <div className="row">
      <div className="col-md-6 mb-3">
        <label className="form-label">{labelStart}</label>
        <input
          type="date"
          value={startDate || ""}
          min={minDate || undefined}
          max={maxDate || undefined}
          onChange={(e) => handleStart(e.target.value)}
          className="form-control"
        />
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label">{labelEnd}</label>
        <input
          type="date"
          value={endDate || ""}
          min={(startDate || minDate) || undefined}
          max={maxDate || undefined}
          onChange={(e) => handleEnd(e.target.value)}
          className="form-control"
        />
      </div>
    </div>
  );
}
