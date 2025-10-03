import { useState } from "react";
import TripItemModal from "./TripItemModal";

const TYPE_BUTTONS = [
  { label: "Flight", btnClass: "btn-flight trip-button" },
  { label: "Accommodation", btnClass: "btn-accommodation trip-button" },
  { label: "Restaurant", btnClass: "btn-restaurant trip-button" },
  { label: "Transport", btnClass: "btn-transport trip-button" },
  { label: "Activity", btnClass: "btn-activity trip-button" },
  { label: "Sightseeing", btnClass: "btn-sightseeing trip-button" },
];

export default function CreateTripItem({
  tripId,
  parentId,
  onCreated,
  tripStart,
  tripEnd,
  defaultDate,
  createFn,
}) {
  const [selectedTypeLabel, setSelectedTypeLabel] = useState(null);
  const effectiveParentId = parentId ?? tripId;
  const CREATE_MODAL_ID = `tripItemModal-${effectiveParentId}-create`;

  return (
    <div className="col-12">
      <div className="card h-100">
        <div className="card-body">
          <h5 className="card-title mb-3">Add Travel Entries</h5>
          <div
            className="trip-buttons py-1"
            role="group"
            aria-label="Add item type"
          >
            {TYPE_BUTTONS.map(({ label, btnClass }) => (
              <button
                key={label}
                type="button"
                className={`btn btn-outline-secondary btn-sm trip-button ${btnClass}`}
                data-bs-toggle="modal"
                data-bs-target={`#${CREATE_MODAL_ID}`}
                onClick={() => setSelectedTypeLabel(label)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <TripItemModal
        modalId={CREATE_MODAL_ID}
        selectedTypeLabel={selectedTypeLabel}
        tripId={tripId}
        parentId={effectiveParentId}
        tripStart={tripStart}
        tripEnd={tripEnd}
        onCreated={onCreated}
        defaultDate={defaultDate}
        createFn={createFn}
      />
    </div>
  );

}