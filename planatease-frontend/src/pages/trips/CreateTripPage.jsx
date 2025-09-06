import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import CitySearchBox from "../../components/trips/CitySearchBox";
import DateRangeInput from "../../components/trips/DateRangeInput";
import { createTrip } from "../../api/trips";

export default function CreateTripPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    source: "google",
    place_id: "",
    formatted_address: "",
    city_name: "",
    country_code: "",
    lat: null,
    lng: null,
    raw_place: null,
  });

  const canSubmit = useMemo(() => {
    return (
      form.start_date &&
      form.end_date &&
      form.place_id &&
      form.source === "google"
    );
  }, [form]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      const payload = {
        name: form.name || form.city_name || form.formatted_address,
        start_date: form.start_date,
        end_date: form.end_date,
        source: form.source,
        place_id: form.place_id,
        formatted_address: form.formatted_address,
        city_name: form.city_name,
        country_code: form.country_code,
        lat: form.lat,
        lng: form.lng,
        raw_place: form.raw_place,
      };

      const created = await createTrip(payload);
      navigate(`/trips/${created.id}`);
    } catch (err) {
      alert(err.body?.detail || err.message || "Failed to create trip");
    }
  };

  return (
    <div className="container my-4" style={{ maxWidth: "600px" }}>
      <div className="card shadow-sm">
        <div className="card-header">
          <h1 className="h5 mb-0">Create Trip</h1>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Trip name (optional)</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="form-control"
                placeholder="e.g., Milan City Break"
              />
            </div>

            <div className="mb-3">
              <CitySearchBox
                onSelect={(city) => setForm((f) => ({ ...f, ...city }))}
              />
            </div>

            <div className="mb-3">
              <DateRangeInput
                startDate={form.start_date}
                endDate={form.end_date}
                onChange={({ startDate, endDate }) =>
                  setForm((f) => ({ ...f, start_date: startDate, end_date: endDate }))
                }
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`btn ${canSubmit ? "btn-primary" : "btn-secondary disabled"}`}
            >
              Create
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
