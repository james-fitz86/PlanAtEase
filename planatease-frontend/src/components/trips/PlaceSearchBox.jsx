import { useEffect, useRef } from "react";

export default function PlaceSearchBox({
  
  value = "",
  onChangeText,
  onSelect,
  placeholder = "Search for a place…",
  label = "Place",
  id = "placeInput",
  includedPrimaryTypes,
  includedRegionCodes,
  locationBias,
  locationRestriction,
}) {
  const hostRef = useRef(null);
  const elementRef = useRef(null);
  const listenersRef = useRef([]);

  useEffect(() => {
    let el;

    async function init() {
      if (!window.google?.maps?.importLibrary || !hostRef.current) return;

      const { PlaceAutocompleteElement } = await google.maps.importLibrary("places");

      el = new PlaceAutocompleteElement();

      if (includedPrimaryTypes) el.includedPrimaryTypes = includedPrimaryTypes;
      if (includedRegionCodes)  el.includedRegionCodes  = includedRegionCodes;
      if (locationBias)         el.locationBias         = locationBias;
      if (locationRestriction)  el.locationRestriction  = locationRestriction;

      el.style.display = "block";
      el.style.width = "100%";
      el.placeholder = placeholder;
      el.id = id;
      el.style.colorScheme = "light"; 

      el.value = value ?? "";
      el.setAttribute("value", value ?? "");

      const handlePlaceSelect = async (event) => {
        try {
          let place = event?.place;

          if (!place && event?.placePrediction?.toPlace) {
            place = event.placePrediction.toPlace();
            await place.fetchFields({
              fields: [
                "id",
                "displayName",
                "formattedAddress",
                "location",
                "types",
                "addressComponents",
                "googleMapsURI",
              ],
            });
          }
          if (!place) return;

          const getText = (v) =>
            typeof v === "string" ? v : v?.text || "";

          const displayName = getText(place.displayName);
          const formatted   = place.formattedAddress || displayName || "";

          const findComp = (type) =>
            (place.addressComponents || []).find((c) => c.types?.includes(type));

          const country_code = findComp("country")?.shortText || "";
          const city_name =
            findComp("locality")?.longText ||
            findComp("postal_town")?.longText ||
            findComp("administrative_area_level_2")?.longText ||
            findComp("administrative_area_level_1")?.longText ||
            displayName;

          const latFn = place.location?.lat;
          const lngFn = place.location?.lng;
          const lat =
            typeof latFn === "function" ? latFn() : place.location?.lat ?? null;
          const lng =
            typeof lngFn === "function" ? lngFn() : place.location?.lng ?? null;

          const text = displayName || formatted || "";
          if (elementRef.current) {
            elementRef.current.value = text;
            elementRef.current.setAttribute("value", text);
          }
          onChangeText?.(text);

          onSelect?.({
            source: "google",
            place_id: place.id || "",
            name: text,
            formatted_address: formatted,
            city_name,
            country_code,
            types: place.types || [],
            lat,
            lng,
            url: place.googleMapsURI || "",
            raw_place: place,
          });
        } catch (err) {
          console.error("Place selection error:", err);
        }
      };

      const handleError = (e) => {
        console.warn("Places gmp-error:", e?.detail || e);
      };

      const handleInput = (e) => {
        onChangeText?.(el.value || "");
      };

      el.addEventListener("gmp-select", handlePlaceSelect);
      el.addEventListener("gmp-placeselect", handlePlaceSelect);
      el.addEventListener("gmp-error", handleError);
      el.addEventListener("input", handleInput);

      listenersRef.current = [
        ["gmp-select", handlePlaceSelect],
        ["gmp-placeselect", handlePlaceSelect],
        ["gmp-error", handleError],
        ["input", handleInput],
      ];

      hostRef.current.innerHTML = "";
      hostRef.current.appendChild(el);
      elementRef.current = el;
    }

    init();

    return () => {
      if (elementRef.current) {
        for (const [evt, fn] of listenersRef.current) {
          try {
            elementRef.current.removeEventListener(evt, fn);
          } catch {}
        }
      }
      listenersRef.current = [];

      if (hostRef.current && elementRef.current) {
        try {
          hostRef.current.removeChild(elementRef.current);
        } catch {}
      }
      elementRef.current = null;
    };
  }, [
    placeholder,
    id,
  ]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;
    if (includedPrimaryTypes) el.includedPrimaryTypes = includedPrimaryTypes;
    if (includedRegionCodes)  el.includedRegionCodes  = includedRegionCodes;
    if (locationBias)         el.locationBias         = locationBias;
    if (locationRestriction)  el.locationRestriction  = locationRestriction;
  }, [
    JSON.stringify(includedPrimaryTypes),
    JSON.stringify(includedRegionCodes),
    JSON.stringify(locationBias),
    JSON.stringify(locationRestriction),
  ]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;
    if (el.value !== (value ?? "")) {
      el.value = value ?? "";
      el.setAttribute("value", value ?? "");
    }
  }, [value]);

  return (
    <div className="mb-3">
      <label htmlFor={id} className="form-label">{label}</label>
      <div ref={hostRef} className="w-100" />
      <div className="form-text">{placeholder}</div>
    </div>
  );
}
