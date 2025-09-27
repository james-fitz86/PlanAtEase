const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function qs(params) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    sp.set(k, String(v));
  }
  return sp.toString();
}

function mapIcon(condition) {
  const code = (condition?.code || "").toLowerCase();
  const desc = (condition?.description?.text || "").toLowerCase();
  if (code.includes("clear") || desc.includes("clear") || desc.includes("sunny")) return "sunny";
  if (desc.includes("partly") || desc.includes("mostly")) return "partly_cloudy";
  if (desc.includes("cloud")) return "cloudy";
  if (desc.includes("thunder")) return "thunder";
  if (desc.includes("snow")) return "snow";
  if (desc.includes("rain") || desc.includes("shower") || desc.includes("drizzle")) return "rain";
  if (desc.includes("mist") || desc.includes("fog")) return "mist";
  return "default";
}

function fmtLocalTime(rfc3339, tz) {
  if (!rfc3339) return "—";
  try {
    return new Date(rfc3339).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz || "UTC",
    });
  } catch {
    return "—";
  }
}

function mapHour(h) {
  const dt = h?.displayDateTime || {};
  const y = dt?.year;
  const m = String(dt?.month ?? "").padStart(2, "0");
  const d = String(dt?.day ?? "").padStart(2, "0");
  const hh = String(dt?.hours ?? 0).padStart(2, "0");
  const mm = String(dt?.minutes ?? 0).padStart(2, "0");
  return {
    key: y && m && d ? `${y}-${m}-${d}T${hh}:${mm}` : null,
    date: y && m && d ? `${y}-${m}-${d}` : null,
    time: `${hh}:${mm}`,
    t: h?.temperature?.degrees ?? null,
    pop: h?.precipitation?.probability?.percent ?? 0,
    _cond: h?.weatherCondition || null,
  };
}

export async function getTripDayWeather(tripId, dateYmd, lat, lng) {
  if (!KEY) throw new Error("Missing VITE_GOOGLE_MAPS_API_KEY");
  if (!lat || !lng) throw new Error("Missing coordinates for trip");

  const dailyUrl = `https://weather.googleapis.com/v1/forecast/days:lookup?${qs({
    "location.latitude": lat,
    "location.longitude": lng,
    unitsSystem: "METRIC",
    days: 10,
    languageCode: "en",
    key: KEY,
  })}`;

  const r1 = await fetch(dailyUrl, { referrerPolicy: "strict-origin-when-cross-origin" });
  if (!r1.ok) {
    const txt = await r1.text().catch(() => "");
    throw new Error(`Daily lookup failed (${r1.status}) ${txt}`);
  }
  const daily = await r1.json();

  const dayRec = (daily?.forecastDays || []).find(d => {
    const y = d?.displayDate?.year;
    const m = String(d?.displayDate?.month || "").padStart(2, "0");
    const dd = String(d?.displayDate?.day || "").padStart(2, "0");
    return y && m && dd && `${y}-${m}-${dd}` === dateYmd;
  });

  const hoursFUrl = `https://weather.googleapis.com/v1/forecast/hours:lookup?${qs({
    "location.latitude": lat,
    "location.longitude": lng,
    unitsSystem: "METRIC",
    hours: 240,
    languageCode: "en",
    key: KEY,
  })}`;

  const hoursHUrl = `https://weather.googleapis.com/v1/history/hours:lookup?${qs({
    "location.latitude": lat,
    "location.longitude": lng,
    unitsSystem: "METRIC",
    hours: 24,
    languageCode: "en",
    key: KEY,
  })}`;

  const [rf, rh] = await Promise.allSettled([
    fetch(hoursFUrl, { referrerPolicy: "strict-origin-when-cross-origin" }),
    fetch(hoursHUrl, { referrerPolicy: "strict-origin-when-cross-origin" }),
  ]);

  let forecast = [];
  if (rf.status === "fulfilled" && rf.value.ok) {
    const j = await rf.value.json();
    forecast = (j?.forecastHours || []).map(mapHour);
  } else if (rf.status === "fulfilled") {
    const txt = await rf.value.text().catch(() => "");
    throw new Error(`Hourly forecast failed (${rf.value.status}) ${txt}`);
  } else {
    throw new Error(`Hourly forecast failed: ${rf.reason?.message || "Network error"}`);
  }

  let history = [];
  if (rh.status === "fulfilled" && rh.value.ok) {
    const j = await rh.value.json();
    history = (j?.historyHours || j?.forecastHours || []).map(mapHour);
  }

  const tz = daily?.timeZone?.id || "UTC";

  const merged = [...history, ...forecast]
    .filter(h => h.key && h.date === dateYmd)
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  const dedup = [];
  const seen = new Set();
  for (const h of merged) {
    if (!seen.has(h.key)) { seen.add(h.key); dedup.push(h); }
  }

  const hourlyRows = dedup;

  const cond =
    dayRec?.daytimeForecast?.weatherCondition ||
    dayRec?.nighttimeForecast?.weatherCondition ||
    hourlyRows[0]?._cond ||
    null;

  const sunrise = fmtLocalTime(dayRec?.sunEvents?.sunriseTime, tz);
  const sunset = fmtLocalTime(dayRec?.sunEvents?.sunsetTime, tz);

  const tHiFromHourly =
    hourlyRows.length ? Math.max(...hourlyRows.map(h => (typeof h.t === "number" ? h.t : -1e9))) : null;
  const tLoFromHourly =
    hourlyRows.length ? Math.min(...hourlyRows.map(h => (typeof h.t === "number" ? h.t : 1e9))) : null;

  return {
    date: dateYmd,
    summary: cond?.description?.text || "—",
    t_hi: dayRec?.maxTemperature?.degrees ?? (Number.isFinite(tHiFromHourly) ? tHiFromHourly : null),
    t_lo: dayRec?.minTemperature?.degrees ?? (Number.isFinite(tLoFromHourly) ? tLoFromHourly : null),
    pop: hourlyRows.length
      ? Math.round(hourlyRows.reduce((a, b) => a + (typeof b.pop === "number" ? b.pop : 0), 0) / hourlyRows.length)
      : 0,
    wind_kmh: null,
    icon: mapIcon(cond),
    sunrise,
    sunset,
    hourly: hourlyRows.map(h => ({ time: h.time, t: h.t, pop: h.pop })),
    attribution: "Weather data © Google",
    timeZone: tz,
  };
}
