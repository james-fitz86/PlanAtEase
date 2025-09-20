function b64urlToJson(b64url) {
  try {
    const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function decodeJwt(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  return b64urlToJson(parts[1]);
}

export function getExp(token) {
  const payload = decodeJwt(token);
  const exp = payload?.exp;
  return Number.isFinite(exp) ? exp : null;
}

export function secondsUntilExpiry(token, { leewaySec = 60 } = {}) {
  const exp = getExp(token);
  if (!exp) return -1;
  const nowSec = Math.floor(Date.now() / 1000);
  return exp - nowSec - leewaySec;
}

export function isExpired(token, { leewaySec = 60 } = {}) {
  return secondsUntilExpiry(token, { leewaySec }) <= 0;
}
