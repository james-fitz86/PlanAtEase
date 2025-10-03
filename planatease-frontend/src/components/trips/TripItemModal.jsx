import { useMemo, useRef, useState, useEffect } from "react";
import PlaceSearchBox from "./PlaceSearchBox";
import {
  createTripItem as authedCreateTripItem,
  updateTripItem as authedUpdateTripItem,
} from "../../api/trips";

const ITEM_TYPE_MAP = {
  Flight: "flight",
  Accommodation: "accommodation",
  Restaurant: "restaurant",
  Transport: "transport",
  Activity: "activity",
  Sightseeing: "sightseeing",
};

const PLACE_FIELD_COPY = {
  flight: {
    label: "Departure Airport / Terminal",
    placeholder: "Search an airport or terminal…",
    primaryTypes: ["airport"],
    titlePlaceholder: "e.g. Flight to Milan",
    descriptionPlaceholder: "Flight Number, Airline, booking ref, terminal/gate…",
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

export default function TripItemModal({
  modalId,
  mode = "create",
  item = null,
  selectedTypeLabel,
  tripId,
  parentId,
  tripStart,
  tripEnd,
  onCreated,
  onSaved,
  defaultDate,
  createFn,
  updateFn,
}) {
  const modalElRef = useRef(null);

  const effectiveCreate =
    createFn || ((id, payload) => authedCreateTripItem(id, payload));
  const effectiveUpdate =
    updateFn || ((id, itemId, payload) => authedUpdateTripItem(id, itemId, payload));
  const effectiveParentId = parentId ?? tripId;

  const currentEnum = ITEM_TYPE_MAP[selectedTypeLabel] ?? "default";
  const fieldCopy = PLACE_FIELD_COPY[currentEnum] ?? PLACE_FIELD_COPY.default;

  const tripStartDate = toDateOnly(tripStart);
  const tripEndDate = toDateOnly(tripEnd);

  const [placeQueryText, setPlaceQueryText] = useState("");

  const emptyForm = {
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
  };

  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode !== "edit") {
      setForm(emptyForm);
      setPlaceQueryText("");
      return;
    }
    if (!item) return;

    const prefilled = {
      title: item.title || "",
      description: item.description || "",
      date: toDateOnly(item.date) || "",
      start_time: item.start_time || "",
      end_time: item.end_time || "",
      place_id: item.place_id || "",
      place_name: item.place_name || "",
      formatted_address: item.formatted_address || "",
      lat: item.lat ?? null,
      lng: item.lng ?? null,
      raw_place: item.raw_place || null,
    };

    setForm(prefilled);
    setPlaceQueryText(prefilled.place_name || prefilled.formatted_address || "");
  }, [mode, item]);

  const canSubmit = useMemo(() => {
    return (
      selectedTypeLabel &&
      effectiveParentId &&
      form.date &&
      form.start_time &&
      form.place_id &&
      form.place_name &&
      form.formatted_address &&
      form.lat != null &&
      form.lng != null
    );
  }, [form, selectedTypeLabel, effectiveParentId]);

  const hideModal = () => {
    const el = modalElRef.current || document.getElementById(modalId);
    if (!el) return;
    const m = window.bootstrap?.Modal.getInstance(el) || new window.bootstrap.Modal(el);
    m.hide();
  };

  const resetForm = () => {
    setForm(emptyForm);
    setPlaceQueryText("");
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

  // A) Invalidate place when the user types so we never submit stale coords
  function handlePlaceTextChange(text) {
    setPlaceQueryText(text);
    const sameAsSelected =
      text === form.place_name || text === form.formatted_address;
    if (!sameAsSelected) {
      setForm((f) => ({
        ...f,
        place_id: "",
        place_name: "",
        formatted_address: "",
        lat: null,
        lng: null,
        raw_place: null,
      }));
    }
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

      if (mode === "edit" && item?.id) {
        const updated = await effectiveUpdate(effectiveParentId, item.id, payload);

        // B) Hydrate with submitted coords so the UI/map updates immediately
        const hydrated = {
          ...updated,
          place_id: payload.place.place_id,
          place_name: payload.place.name,
          formatted_address: payload.place.formatted_address,
          lat: payload.place.geometry.location.lat,
          lng: payload.place.geometry.location.lng,
          raw_place: payload.place.raw_place ?? updated.raw_place ?? null,
          date: payload.date ?? updated.date,
          start_time: payload.start_time ?? updated.start_time,
          end_time: payload.end_time ?? updated.end_time,
          title: payload.title ?? updated.title,
          description: payload.description ?? updated.description,
        };

        onSaved?.(hydrated);
      } else {
        const created = await effectiveCreate(effectiveParentId, payload);
        onCreated?.(created);
        resetForm();
      }

      hideModal();
    } catch (err) {
      const msg =
        err.body?.detail ||
        err.body?.non_field_errors?.[0] ||
        err.body?.date?.[0] ||
        err.body?.end_time?.[0] ||
        err.message ||
        (mode === "edit" ? "Failed to update trip item" : "Failed to create trip item");
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

  useEffect(() => {
    const el = modalElRef.current || document.getElementById(modalId);
    if (!el) return;

    const handleShow = () => {
      if (mode === "edit") return;
      const prefill = defaultDate ? clampDate(toDateOnly(defaultDate)) : "";
      setForm((f) => ({ ...f, date: prefill || "" }));
    };

    el.addEventListener("show.bs.modal", handleShow);
    return () => el.removeEventListener("show.bs.modal", handleShow);
  }, [modalId, mode, defaultDate, tripStartDate, tripEndDate]);

  const headerText =
    mode === "edit" ? `Edit ${selectedTypeLabel || "item"}` : `Add ${selectedTypeLabel || "item"}`;
  const submitText = submitting
    ? mode === "edit"
      ? "Saving…"
      : "Adding…"
    : mode === "edit"
    ? "Save changes"
    : "Add item";

  return (
    <div className="modal fade" id={modalId} tabIndex="-1" aria-hidden="true" ref={modalElRef}>
      <div className="modal-dialog">
        <form className="modal-content" onSubmit={handleSubmit}>
          <div className="modal-header">
            <h5 className="modal-title">{headerText}</h5>
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
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Description (optional)</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder={fieldCopy.descriptionPlaceholder}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <PlaceSearchBox
              id={`${modalId}-place`}
              label={fieldCopy.label}
              placeholder={fieldCopy.placeholder}
              includedPrimaryTypes={fieldCopy.primaryTypes}
              value={placeQueryText}
              onChangeText={handlePlaceTextChange}
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
                  onChange={(e) => setForm((f) => ({ ...f, date: clampDate(e.target.value) }))}
                  required
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Start time</label>
                <input
                  type="time"
                  className="form-control"
                  value={form.start_time || ""}
                  onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
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
                onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
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
              {submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
