import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import CitySearchBox from "../../components/trips/CitySearchBox";
import DateRangeInput from "../../components/trips/DateRangeInput";
import { createTrip } from "../../api/trips";
import { guestCreateTrip } from "../../api/trips_guest";
import { getTokens } from "../../auth/storage";
import PageContainer from "../../components/base/PageContainer";

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

  const handleCancel = () => {
    const tokens = getTokens();
    const isAuthed = !!tokens?.access;
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(isAuthed ? "/dashboard" : "/");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

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

    try {
      const tokens = getTokens();
      const isAuthed = !!tokens?.access;

      if (isAuthed) {
        const created = await createTrip(payload);
        navigate(`/trips/${created.id}`);
      } else {
        const created = await guestCreateTrip(payload);
        navigate(`/guest/trips/${created.id}`);
      }
    } catch (err) {
      const msg =
        err?.body?.detail ||
        (typeof err?.body === "string" ? err.body : null) ||
        err.message ||
        "Failed to create trip";
      alert(msg);
    }
  };

  return (
    <PageContainer className="my-4">
      <div className="card shadow-sm mx-auto" style={{ maxWidth: 600 }}>
        <div className="card-header d-flex justify-content-between align-items-center">
          <h1 className="h5 mb-0">Create Trip</h1>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Trip name (optional)</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="form-control"
                placeholder="e.g. Milan City Break"
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
                  setForm((f) => ({
                    ...f,
                    start_date: startDate,
                    end_date: endDate,
                  }))
                }
              />
            </div>

            <div className="d-flex flex-column flex-sm-row justify-content-between gap-2 mt-3">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleCancel}
              >
                Back
              </button>

              <button
                type="submit"
                disabled={!canSubmit}
                className={`btn ${
                  canSubmit ? "btn-primary" : "btn-secondary disabled"
                }`}
              >
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    </PageContainer>
  );
}
