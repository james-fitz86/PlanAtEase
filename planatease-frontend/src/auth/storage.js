const STORAGE_KEY = "auth";
const META_KEY = "auth_meta";

// For getting, setting and clearing tokens from localStorage

function postAuthMessage(payload) {
  try {
    if (typeof BroadcastChannel !== "undefined") {
      if (!postAuthMessage.bc) postAuthMessage.bc = new BroadcastChannel("auth");
      postAuthMessage.bc.postMessage(payload);
    }
  } catch {}
}

export function getTokens() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setTokens(tokens) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  window.dispatchEvent(new Event("auth-changed"));
  postAuthMessage({ type: "set" });
}

export function clearTokens() {
  localStorage.removeItem(STORAGE_KEY);
  clearMeta();
  window.dispatchEvent(new Event("auth-changed"));
  postAuthMessage({ type: "clear" });
}

export function getMeta() {
  const raw = localStorage.getItem(META_KEY);
  return raw ? JSON.parse(raw) : {};
}
export function setMeta(patch) {
  const cur = getMeta();
  localStorage.setItem(META_KEY, JSON.stringify({ ...cur, ...patch }));
}
export function clearMeta() {
  localStorage.removeItem(META_KEY);
}