import { useMemo, useRef, useState } from "react";
import PlaceSearchBox from "./PlaceSearchBox";
import { createTripItem } from "../../api/trips";

const ITEM_TYPE_MAP = {
  Flight: "flight",
  Accommodation: "accommodation",
  Restaurant: "restaurant",
  Transport: "transport",
  Activity: "activity",
  Sightseeing: "sightseeing",
};

const TYPE_BUTTONS = [
  { label: "Flight", btnClass: "btn-flight trip-button" },
  { label: "Accommodation", btnClass: "btn-accommodation trip-button" },
  { label: "Restaurant", btnClass: "btn-restaurant trip-button" },
  { label: "Transport", btnClass: "btn-transport trip-button" },
  { label: "Activity", btnClass: "btn-activity trip-button" },
  { label: "Sightseeing", btnClass: "btn-sightseeing trip-button" },
];

const PLACE_FIELD_COPY = {
  flight: {
    label: "Departure Airport / Terminal",
    placeholder: "Search an airport or terminal…",
    primaryTypes: ["airport"],
    titlePlaceholder: "e.g. FR 838",
    descriptionPlaceholder: "Airline, booking ref, terminal/gate…",
  },
  accommodation: {
    label: "Hotel / property",
    placeholder: "Search a hotel, B&B, or property…",
    primaryTypes: ["lodging"],
    titlePlaceholder: "e.g. Hotel Aurora (3 nights)",
    descriptionPlaceholder: "Check-in time, booking ref, room type…",
  },
  restaurant: {
    label: "Restaurant",
    placeholder: "Search a restaurant or café…",
    primaryTypes: ["restaurant"],
    titlePlaceholder: "e.g. Trattoria da Enzo 29",
    descriptionPlaceholder: "Reservation name/time, notes…",
  },
  transport: {
    label: "Pickup / drop-off location",
    placeholder: "Search a station or pickup spot…",
    primaryTypes: ["transit_station", "establishment"],
    titlePlaceholder: "e.g. Metro M3 to Duomo",
    descriptionPlaceholder: "Tickets, pickup notes, platform…",
  },
  activity: {
    label: "Venue / meeting point",
    placeholder: "Search a venue or meeting point…",
    primaryTypes: ["establishment"],
    titlePlaceholder: "e.g. Duomo guided tour",
    descriptionPlaceholder: "Meeting point, voucher code…",
  },
  sightseeing: {
    label: "Place / landmark",
    placeholder: "Search a landmark or attraction…",
    primaryTypes: ["tourist_attraction", "establishment"],
    titlePlaceholder: "e.g. Duomo di Milano",
    descriptionPlaceholder: "Opening hours, ticket link…",
  },
  default: {
    label: "Place",
    placeholder: "Search for a place…",
    primaryTypes: ["establishment"],
    titlePlaceholder: "e.g. BA 838, Hotel Aurora, Duomo Tour",
    descriptionPlaceholder: "Notes, confirmation number, meeting point…",
  },
};


const toDateOnly = (s) => (s ? String(s).slice(0, 10) : undefined);

export default function CreateTripItem({ tripId, onCreated, tripStart, tripEnd }) {
  const [selectedTypeLabel, setSelectedTypeLabel] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const currentEnum = ITEM_TYPE_MAP[selectedTypeLabel] ?? "default";
  const fieldCopy = PLACE_FIELD_COPY[currentEnum] ?? PLACE_FIELD_COPY.default;

  const tripStartDate = toDateOnly(tripStart);
  const tripEndDate = toDateOnly(tripEnd);

  const [placeQueryText, setPlaceQueryText] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    start_time: "",
    end_time: "",
    place_id: "",
    place_name: "",
    formatted_address: "",
    lat: null,
    lng: null,
    raw_place: null,
  });

  const modalId = "createTripItemModal";
  const modalElRef = useRef(null);

  const canSubmit = useMemo(() => {
    return (
      selectedTypeLabel &&
      form.date &&
      form.start_time &&
      form.place_id &&
      form.place_name &&
      form.formatted_address &&
      form.lat != null &&
      form.lng != null
    );
  }, [form, selectedTypeLabel]);

  const openModal = (label) => {
    setError("");
    setSelectedTypeLabel(label);
    const el = document.getElementById(modalId);
    modalElRef.current = el;
    const m =
      window.bootstrap?.Modal.getInstance(el) || new window.bootstrap.Modal(el);
    m.show();
  };

  const hideModal = () => {
    const el = modalElRef.current || document.getElementById(modalId);
    if (!el) return;
    const m =
      window.bootstrap?.Modal.getInstance(el) || new window.bootstrap.Modal(el);
    m.hide();
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      date: "",
      start_time: "",
      end_time: "",
      place_id: "",
      place_name: "",
      formatted_address: "",
      lat: null,
      lng: null,
      raw_place: null,
    });
    setSelectedTypeLabel(null);
    setError("");
  };

  function makeBackendPlaceJSON() {
    return {
      place_id: form.place_id,
      id: form.place_id,
      name: form.place_name,
      formatted_address: form.formatted_address,
      geometry: {
        location: { lat: form.lat, lng: form.lng },
      },
      raw_place: form.raw_place,
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        item_type: ITEM_TYPE_MAP[selectedTypeLabel] ?? "other",
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time || null,
        title: form.title?.trim() || "",
        description: form.description?.trim() || "",
        place: makeBackendPlaceJSON(),
      };

      console.log("POSTING date:", payload.date);

      const created = await createTripItem(tripId, payload);
      onCreated?.(created);
      hideModal();
      resetForm();
    } catch (err) {
      const msg =
        err.body?.detail ||
        err.body?.non_field_errors?.[0] ||
        err.body?.date?.[0] ||
        err.body?.end_time?.[0] ||
        err.message ||
        "Failed to create trip item";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const clampDate = (val) => {
    if (!val) return val;
    if (tripStartDate && val < tripStartDate) return tripStartDate;
    if (tripEndDate && val > tripEndDate) return tripEndDate;
    return val;
  };

  return (
    <div className="col-12">
      <div className="card h-100">
        <div className="card-body">
          <h5 className="card-title mb-3">Add Trip Items</h5>
          <div
            className="d-flex flex-column flex-sm-row flex-sm-wrap justify-content-center align-items-center gap-2 py-1"
            role="group"
            aria-label="Add item type"
          >
            {TYPE_BUTTONS.map(({ label, btnClass }) => (
              <button
                key={label}
                type="button"
                className={`btn btn-outline-secondary btn-sm ${btnClass}`}
                onClick={() => openModal(label)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="modal fade" id={modalId} tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog">
          <form className="modal-content" onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">
                Add {selectedTypeLabel || "item"}
              </h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={() => setError("")}
              />
            </div>

            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder={fieldCopy.titlePlaceholder}
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Description(optional)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder={fieldCopy.descriptionPlaceholder}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>

              <PlaceSearchBox
                label={fieldCopy.label}
                placeholder={fieldCopy.placeholder}
                includedPrimaryTypes={fieldCopy.primaryTypes}
                value={placeQueryText}
                onChangeText={setPlaceQueryText}
                onClear={() => {
                  setPlaceQueryText("");
                  setForm((f) => ({
                    ...f,
                    place_id: "",
                    place_name: "",
                    formatted_address: "",
                    lat: null,
                    lng: null,
                    raw_place: null,
                  }));
                }}
                onSelect={(p) => {
                  const placeName = p.name || p.formatted_address || "";
                  setForm((f) => ({
                    ...f,
                    place_id: p.place_id || "",
                    place_name: placeName,
                    formatted_address: p.formatted_address || "",
                    lat: p.lat ?? null,
                    lng: p.lng ?? null,
                    raw_place: p.raw_place || p,
                  }));
                  setPlaceQueryText(placeName);
                }}
              />

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.date || ""}
                    min={tripStartDate}
                    max={tripEndDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, date: clampDate(e.target.value) }))
                    }
                    required
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Start time</label>
                  <input
                    type="time"
                    className="form-control"
                    value={form.start_time || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, start_time: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">End time (optional)</label>
                <input
                  type="time"
                  className="form-control"
                  value={form.end_time || ""}
                  min={form.start_time || undefined}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, end_time: e.target.value }))
                  }
                />
                <div className="form-text">If provided, must be after the start time.</div>
              </div>

              {error && <div className="alert alert-danger py-2">{error}</div>}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                data-bs-dismiss="modal"
                onClick={() => setError("")}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={!canSubmit || submitting}>
                {submitting ? "Adding…" : "Add item"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
