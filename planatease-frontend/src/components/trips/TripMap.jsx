import { useEffect, useRef } from "react";
import { ensureGoogleMaps } from "../../utils/googleMapsLoader";

const TYPE_COLORS = {
  flight: "#1e90ff",
  accommodation: "#20b2aa",
  restaurant: "#dc143c",
  transport: "#ff8c00",
  activity: "#228b22",
  sightseeing: "#6a5acd",
  default: "#808080",
};

export default function TripMap({ apiKey, items = [], center }) {
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const infoRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      console.log("MAP_ID from env:", import.meta.env.VITE_GOOGLE_MAPS_MAP_ID);
      await ensureGoogleMaps();

      if (cancelled) return;

      const { Map } = await google.maps.importLibrary("maps");
      await google.maps.importLibrary("marker");

      mapRef.current = new Map(mapDivRef.current, {
        center: center || { lat: 0, lng: 0 },
        zoom: 6,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
        mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID,
      });

      infoRef.current = new google.maps.InfoWindow();

      renderMarkers(items);
      fitToItems(items);
    }

    init();

    return () => {
      cancelled = true;
      clearMarkers();
      infoRef.current = null;
      mapRef.current = null;
    };
  }, [apiKey, center]);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps?.marker) return;
    renderMarkers(items);
    fitToItems(items);
  }, [items]);

  function clearMarkers() {
    for (const m of markersRef.current) m.map = null;
    markersRef.current = [];
  }

  function makeInfoHtml(item) {
    const when = [item.date, item.start_time].filter(Boolean).join(" ");
    return `
      <div style="max-width:240px">
        <div style="font-weight:600;margin-bottom:4px">
          ${item.title || item.place_name || "Item"}
        </div>
        <div style="opacity:.8;font-size:12px">${when}</div>
        <div style="margin-top:6px;font-size:12px">${item.formatted_address || ""}</div>
      </div>
    `;
  }

  function renderMarkers(data) {
    if (!mapRef.current) return;
    const { AdvancedMarkerElement, PinElement } = google.maps.marker;

    clearMarkers();

    for (const item of data) {
      if (item.lat == null || item.lng == null) continue;

      const color = TYPE_COLORS[item.item_type] || TYPE_COLORS.default;

      const pin = new PinElement({
        background: color,
        borderColor: color,
        glyphColor: "white",
      });

      const marker = new AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: Number(item.lat), lng: Number(item.lng) },
        title: item.title || item.place_name || "Trip item",
        content: pin.element,
      });

      marker.addListener("click", () => {
        infoRef.current?.setContent(makeInfoHtml(item));
        infoRef.current?.open({ map: mapRef.current, anchor: marker });
      });

      markersRef.current.push(marker);
    }
  }

  function fitToItems(data) {
    if (!mapRef.current) return;
    const coords = data.filter(i => i.lat != null && i.lng != null);

    if (coords.length === 1) {
      mapRef.current.setCenter(coords[0]);
      mapRef.current.setZoom(11);
    } else if (coords.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      coords.forEach(i => bounds.extend({ lat: Number(i.lat), lng: Number(i.lng) }));
      mapRef.current.fitBounds(bounds, 64);
    } else if (center) {
      mapRef.current.setCenter(center);
      mapRef.current.setZoom(6);
    }
  }

  return (
    <div style={{ width: "100%", height: "100%", minHeight: 380 }}>
      <div ref={mapDivRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
