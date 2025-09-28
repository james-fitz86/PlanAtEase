import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getTripDayWeather } from "../../api/weather";

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initialValue; }
    catch { return initialValue; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

const ICONS = {
  clear: "☀️", sunny: "☀️", partly_cloudy: "⛅", cloudy: "☁️",
  rain: "🌧️", showers: "🌦️", thunder: "⛈️", snow: "🌨️",
  mist: "🌫️", default: "🌤️",
};

const ICONS_NIGHT = {
  clear: "🌙", sunny: "🌙", partly_cloudy: "☁️🌙", cloudy: "☁️",
  rain: "🌧️", showers: "🌦️", thunder: "⛈️", snow: "🌨️",
  mist: "🌫️", default: "🌙",
};

const WEATHER_TTL_MS = 6 * 60 * 60 * 1000;
const _weatherMem = new Map();
const _lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } };
const _lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

function useWeather({ tripId, dateKey, prefetchKeys = [], cacheNs = "wx", lat, lng }) {
  const [state, setState] = useState({ status: "idle", data: null, error: "" });

  useEffect(() => {
    if (!tripId || !dateKey) { setState({ status: "idle", data: null, error: "" }); return; }
    let cancelled = false;
    const key = `${cacheNs}:${tripId}:${dateKey}`;

    async function load(k) {
      const now = Date.now();
      const mem = _weatherMem.get(k);
      if (mem && now - mem.t < WEATHER_TTL_MS) return mem.data;

      const ls = _lsGet(k);
      if (ls && now - ls.t < WEATHER_TTL_MS) { _weatherMem.set(k, ls); return ls.data; }

      const data = await getTripDayWeather(tripId, k.split(":").pop() || dateKey, lat, lng);
      const wrapped = { t: now, data };
      _weatherMem.set(k, wrapped); _lsSet(k, wrapped);
      return data;
    }

    const t = setTimeout(() => {
      setState((s) => ({ ...s, status: "loading", error: "" }));
      load(key)
        .then((data) => { if (!cancelled) setState({ status: "ready", data, error: "" }); })
        .catch((e) => { if (!cancelled) setState({ status: "error", data: null, error: e.message || "Weather unavailable" }); });

      prefetchKeys.forEach((pk) => pk && load(`${cacheNs}:${tripId}:${pk}`).catch(() => {}));
    }, 200);

    return () => { cancelled = true; clearTimeout(t); };
  }, [tripId, dateKey, JSON.stringify(prefetchKeys), cacheNs, lat, lng]);

  return state;
}

function hhmmToMinutes(str) {
  if (!str) return null;
  const m = str.match(/T?(\d{2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}
function isNightAt(mins, sunriseMin, sunsetMin) {
  if (mins == null || sunriseMin == null || sunsetMin == null) return null;
  return mins < sunriseMin || mins >= sunsetMin;
}

const WxCtx = createContext(null);
export function WeatherProvider({ storageKey, tripId, dateKey, neighborKeys = [], lat, lng, children }) {
  const wxOpenKey = `${storageKey}:wxOpen`;
  const [wxOpen, setWxOpen] = useLocalStorage(wxOpenKey, false);
  const wxState = useWeather({ tripId, dateKey, prefetchKeys: neighborKeys, cacheNs: "wx", lat, lng });
  const value = useMemo(() => ({ wxState, wxOpen, setWxOpen }), [wxState, wxOpen, setWxOpen]);
  return <WxCtx.Provider value={value}>{children}</WxCtx.Provider>;
}
function useWxCtx() {
  const ctx = useContext(WxCtx);
  if (!ctx) throw new Error("Weather components must be used inside <WeatherProvider>");
  return ctx;
}

function WeatherPillBase({ size = "compact" }) {
  const { wxState, wxOpen, setWxOpen } = useWxCtx();
  const wx = wxState.data;
  const isLoading = wxState.status === "loading" || wxState.status === "idle";
  const isError = wxState.status === "error";
  const icon = wx?.icon ? (ICONS[wx.icon] || ICONS.default) : ICONS.default;
  const hiLo = wx ? `${Math.round(wx.t_hi)}° / ${Math.round(wx.t_lo)}°` : "—";
  const extras = wx
    ? `• 💧 ${Math.round(wx.pop)}% • 💨 ${Math.round(wx.wind_kmh)} km/h`
    : "";

  const label = size === "compact" ? hiLo : `${hiLo} ${extras}`;

  return (
    <button
      type="button"
      className="btn btn-light btn-sm weather-pill"
      aria-expanded={wxOpen}
      aria-controls="weather-details"
      onClick={() => setWxOpen((v) => !v)}
      disabled={isLoading || isError}
      title={isError ? "Weather unavailable" : "Show weather details"}
      style={{ whiteSpace: "nowrap" }}
    >
      {isLoading ? (
        <span className="wx-skel" aria-hidden="true" />
      ) : isError ? (
        <span className="text-muted">Weather unavailable</span>
      ) : (
        <>
          <span style={{ marginRight: 6 }}>{icon}</span>
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

export function WeatherPillInline() {
  return <WeatherPillBase size="full" />;
}
export function WeatherPillMobile() {
  return <WeatherPillBase size="compact" />;
}



function HourChip({ time, t, pop, cond, isNight }) {
  const iconKey = String(cond?.code ?? cond?.icon ?? "").toLowerCase();
  const descKey = String(cond?.description?.text ?? cond?.text ?? "").toLowerCase();
  const TABLE = isNight ? ICONS_NIGHT : ICONS;

  console.log("cond shapes:", typeof cond?.code, cond?.code, typeof descKey, descKey);

  let icon = TABLE.default;

  if (iconKey.includes("thunder") || descKey.includes("thunder")) icon = TABLE.thunder;
  else if (iconKey.includes("snow") || descKey.includes("snow")) icon = TABLE.snow;
  else if (
    iconKey.includes("rain") || descKey.includes("rain") ||
    descKey.includes("shower") || descKey.includes("drizzle")
  ) icon = TABLE.rain;

  else if (iconKey.includes("mist") || descKey.includes("mist") ||
           descKey.includes("fog")  || descKey.includes("haze")) icon = TABLE.mist;

  else if (
    (descKey.includes("clear") || descKey.includes("sunny") || iconKey.includes("clear")) &&
    (descKey.includes("cloud") || iconKey.includes("cloud"))
  ) icon = TABLE.partly_cloudy;

  else if (descKey.includes("overcast") || iconKey.includes("overcast") || descKey.includes("cloud") || iconKey.includes("cloud"))
    icon = TABLE.cloudy;

  else if (descKey.includes("partly") || descKey.includes("mostly"))
    icon = TABLE.partly_cloudy;

  else if (descKey.includes("clear") || descKey.includes("sunny") || iconKey.includes("clear"))
    icon = TABLE.sunny;

  return (
    <div className="bg-light border rounded-3 text-center" style={{ minWidth: 84, padding: "10px 8px" }}>
      <div className="text-muted small" style={{ lineHeight: 1.1 }}>{time}</div>
      <div style={{ fontSize: 20, lineHeight: 1.2 }}>{icon}</div>
      <div className="fw-semibold" style={{ fontSize: 16, lineHeight: 1.2 }}>{Math.round(t)}°</div>
      <div className="small" style={{ lineHeight: 1.1 }}>💧 {Math.round(pop)}%</div>
    </div>
  );
}



export function WeatherDetails() {
  const { wxState, wxOpen } = useWxCtx();
  const wx = wxState.data;
  if (!wx || wxState.status !== "ready" || !wxOpen) return null;

  const hasHourly = Array.isArray(wx.hourly) && wx.hourly.length > 0;

  if (wx?.hourly?.length) {
    console.log("hour[0] keys:", Object.keys(wx.hourly[0] || {}), wx.hourly[0]);
  }

  return (
    <div className="px-3 pt-2 border-bottom">
      <div id="weather-details" className="mt-2 small">
        <div className="d-flex flex-wrap gap-3">
          <div>
            <strong>Summary:</strong>{" "}
            {wx.icon ? (ICONS[wx.icon] || ICONS.default) : ICONS.default} {wx.summary}
          </div>
          <div>
            <strong>Sunrise:</strong> 🌅 {wx.sunrise}
          </div>
          <div>
            <strong>Sunset:</strong> 🌇 {wx.sunset}
          </div>
        </div>

        {hasHourly && (
          <div className="mt-3">
            <div className="fw-semibold mb-2">Hourly</div>
            <div
              className="d-flex gap-2"
              style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 6 }}
              aria-label="Hourly forecast, scroll horizontally"
            >
              {(() => {
                const sunriseMin = hhmmToMinutes(wx.sunrise);
                const sunsetMin  = hhmmToMinutes(wx.sunset);
                return wx.hourly.map((h, i) => {
                  const derivedNight = isNightAt(hhmmToMinutes(h.time), sunriseMin, sunsetMin);
                  const isNight =
                    (typeof h.is_day === "boolean" ? !h.is_day : null) ??
                    (typeof h.isNight === "boolean" ? h.isNight : null) ??
                    (h.dayNight ? String(h.dayNight).toUpperCase() === "NIGHT" : null) ??
                    derivedNight;

                  return (
                    <HourChip
                      key={i}
                      time={h.time}
                      t={h.t}
                      pop={h.pop}
                      cond={h._cond}
                      isNight={!!isNight}
                    />
                  );
                });
              })()}
            </div>
            {wx.debug?.merged_for_date_count !== undefined && (
              <div className="text-muted small mt-1">
                Showing {wx.debug.merged_for_date_count} hour{wx.debug.merged_for_date_count === 1 ? "" : "s"}
              </div>
            )}
          </div>
        )}


        {wx.attribution && <div className="mt-2 text-muted">{wx.attribution}</div>}
      </div>
    </div>
  );
}
