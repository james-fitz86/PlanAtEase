import API from "../api";
import { getTokens, setTokens, clearTokens, getMeta } from "./storage";
import { secondsUntilExpiry, isExpired } from "./jwt";

let timerId = null;
let restoring = false;

const MAX_SESSION_MS = 7 * 24 * 60 * 60 * 1000;

function setRestoring(v) {
  restoring = v;
  window.dispatchEvent(new CustomEvent("auth-restoring", { detail: { restoring } }));
}

export function isRestoring() {
  return restoring;
}

function clearTimer() {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
}

async function refreshNow() {
  const tokens = getTokens();
  if (!tokens?.refresh) return false;

  const firstLoginAt = getMeta()?.firstLoginAt ?? Date.now();
  if (Date.now() - firstLoginAt > MAX_SESSION_MS) {
    localStorage.setItem("auth_logout_reason", "session_max_reached");
    
    clearTokens();
    clearTimer();
    if (window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
    return false;
  }

  try {
    setRestoring(true);
    const { data } = await API.post("/auth/jwt/refresh/", { refresh: tokens.refresh });

    const newTokens = { access: data.access, refresh: data.refresh || tokens.refresh };
    setTokens(newTokens);

    scheduleFromAccess(newTokens.access);
    return true;
  } catch (e) {
    clearTokens();
    clearTimer();
    return false;
  } finally {
    setRestoring(false);
  }
}

export function scheduleFromAccess(accessToken) {
  clearTimer();
  if (!accessToken) return;

  const secs = secondsUntilExpiry(accessToken, { leewaySec: 60 });
  if (secs <= 0) {
    timerId = setTimeout(refreshNow, 0);
    return;
  }
  timerId = setTimeout(() => {
    if (!navigator.onLine) {
      const onBack = () => {
        window.removeEventListener("online", onBack);
        refreshNow();
      };
      window.addEventListener("online", onBack, { once: true });
      return;
    }
    refreshNow();
  }, secs * 1000);
}

export function startAuthScheduler() {
  const tokens = getTokens();
  if (tokens?.access) {
    const needImmediate = isExpired(tokens.access, { leewaySec: 60 });
    if (needImmediate) refreshNow(); else scheduleFromAccess(tokens.access);
  }

  const onAuthChanged = () => {
    const t = getTokens();
    if (t?.access) scheduleFromAccess(t.access);
    else clearTimer();
  };

  window.addEventListener("auth-changed", onAuthChanged);

  const onStorage = (e) => {
    if (e.key !== "auth") return;
    onAuthChanged();
  };
  window.addEventListener("storage", onStorage);

  let bc = null;
  if (typeof BroadcastChannel !== "undefined") {
    bc = new BroadcastChannel("auth");
    bc.addEventListener("message", onAuthChanged);
  }

  const onOffline = () => clearTimer();
  window.addEventListener("offline", onOffline);

  return () => {
    clearTimer();
    window.removeEventListener("auth-changed", onAuthChanged);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("offline", onOffline);
    if (bc) bc.close();
  };
}