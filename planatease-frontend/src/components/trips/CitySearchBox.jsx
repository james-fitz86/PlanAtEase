import { useEffect, useRef, useState } from "react";

export default function CitySearchBox({
  onSelect,
  placeholder = "Search for a city…",
  defaultValue = "",
  disabled = false,
}) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [value, setValue] = useState(defaultValue);
  const [selected, setSelected] = useState(false);

  
  const getCountryCode = (components = []) => {
    const cc = components.find((c) => c.types.includes("country"));
    return cc?.short_name || "";
  };

  
  const getCityName = (place) => {
    const comps = place.address_components || [];
    const locality =
      comps.find((c) => c.types.includes("locality")) ||
      comps.find((c) => c.types.includes("postal_town")) ||
      comps.find((c) => c.types.includes("administrative_area_level_2")) ||
      comps.find((c) => c.types.includes("administrative_area_level_1"));

    return locality?.long_name || place.name || "";
  };

  useEffect(() => {
    if (!window.google?.maps?.places || !inputRef.current) return;

    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["(cities)"],
      fields: [
        "place_id",
        "name",
        "formatted_address",
        "geometry.location",
        "address_components",
      ],
    });

    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      if (!place || !place.place_id || !place.geometry?.location) {
        setSelected(false);
        return;
      }

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const city_name = getCityName(place);
      const country_code = getCountryCode(place.address_components);
      const formatted_address = place.formatted_address || city_name;

      const payload = {
        source: "google",
        place_id: place.place_id,
        formatted_address,
        city_name,
        country_code,
        lat,
        lng,
        raw_place: place,
      };

      setValue(city_name || formatted_address || "");
      setSelected(true);
      onSelect?.(payload);
    });

    autocompleteRef.current = ac;
    return () => {
      
      autocompleteRef.current = null;
    };
  }, [onSelect]);

  
  const handleChange = (e) => {
    setValue(e.target.value);
    setSelected(false);
  };

  return (
    <div className="mb-3">
      <label htmlFor="cityInput" className="form-label">
        City
      </label>
      <input
        id="cityInput"
        ref={inputRef}
        value={value}
        onChange={handleChange}
        type="text"
        placeholder={placeholder}
        disabled={disabled}
        className={`form-control ${!selected && value.length > 0 ? "is-invalid" : ""}`}
        aria-invalid={!selected && value.length > 0 ? "true" : "false"}
        aria-describedby="city-helper"
      />
    </div>
  );
}
