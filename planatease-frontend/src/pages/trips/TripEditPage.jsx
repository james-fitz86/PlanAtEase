import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CitySearchBox from "../../components/trips/CitySearchBox";
import DateRangeInput from "../../components/trips/DateRangeInput";
import { getTrip, updateTrip } from "../../api/trips";
import PageContainer from "../../components/base/PageContainer";

export default function TripEditPage() {
  const { tripUid, id } = useParams();
  const tripKey = tripUid || id;

  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tripMeta, setTripMeta] = useState(null);

  useEffect(() => {
    if (!tripKey) return;
    (async () => {
      try {
        const t = await getTrip(tripKey);
        setTripMeta({ uid: t.uid, slug: t.slug, id: t.id });
        setForm({
          name: t.name || "",
          start_date: t.start_date || "",
          end_date: t.end_date || "",
          source: t.source || "google",
          place_id: t.place_id || "",
          formatted_address: t.formatted_address || "",
          city_name: t.city_name || "",
          country_code: t.country_code || "",
          lat: t.lat ?? null,
          lng: t.lng ?? null,
          raw_place: t.raw_place ?? null,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [tripKey]);

  const canSubmit = useMemo(() => {
    if (!form) return false;
    return (
      form.start_date &&
      form.end_date &&
      form.place_id &&
      form.source === "google"
    );
  }, [form]);

  function targetPath(meta) {
    const ident = meta?.slug || meta?.uid || meta?.id || tripKey;
    return `/trips/${ident}`;
  }

  async function handleSubmit(e) {
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
      const updated = await updateTrip(tripKey, payload);
      navigate(targetPath(updated));
    } catch (err) {
      alert(err.body?.detail || err.message || "Failed to update trip");
    }
  }

  if (loading || !form) {
    return (
      <PageContainer className="my-4">
        <div className="text-center py-5">Loading…</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="my-4">
      <div className="card shadow-sm mx-auto" style={{ maxWidth: 600 }}>
        <div className="card-header">
          <h1 className="h5 mb-0">Edit Trip</h1>
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
                placeholder="e.g. Milan City Break"
              />
            </div>

            <div className="mb-3">
              <CitySearchBox
                initialText={
                  form.formatted_address ||
                  [form.city_name, form.country_code].filter(Boolean).join(", ")
                }
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

            <div className="d-flex justify-content-center gap-2 mt-3">
              <button
                type="submit"
                disabled={!canSubmit}
                className={`btn ${canSubmit ? "btn-primary" : "btn-secondary disabled"}`}
              >
                Save changes
              </button>

              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => navigate(targetPath(tripMeta))}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </PageContainer>
  );
}

