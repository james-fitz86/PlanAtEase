export default function DateRangeInput({
  startDate,
  endDate,
  onChange,
  labelStart = "Start date",
  labelEnd = "End date",
}) {
  return (
    <div className="row">
      <div className="col-md-6 mb-3">
        <label className="form-label">{labelStart}</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) =>
            onChange({ startDate: e.target.value, endDate })
          }
          className="form-control"
        />
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label">{labelEnd}</label>
        <input
          type="date"
          value={endDate}
          min={startDate || undefined}
          onChange={(e) =>
            onChange({ startDate, endDate: e.target.value })
          }
          className="form-control"
        />
      </div>
    </div>
  );
}
