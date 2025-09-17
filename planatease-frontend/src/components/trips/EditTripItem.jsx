import TripItemModal from "./TripItemModal";

function toDisplayLabel(item) {
  if (item?.item_type_label) return item.item_type_label;
  if (!item?.item_type) return "Item";
  return item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1);
}

export default function EditTripItem({
  modalId,
  item,
  tripId,
  tripStart,
  tripEnd,
  onSaved,
}) {

  return (
    <TripItemModal
      modalId={modalId}
      mode="edit"
      item={item}
      selectedTypeLabel={toDisplayLabel(item)}
      tripId={tripId}
      tripStart={tripStart}
      tripEnd={tripEnd}
      onSaved={onSaved}
    />
  );
}
