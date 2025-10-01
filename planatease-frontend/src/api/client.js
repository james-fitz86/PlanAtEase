import { getTokens } from "../auth/storage";

const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL;
export const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

function joinUrl(base, path = "") {
  const clean = String(path || "").replace(/^\/+/, "");
  return clean ? `${base}/${clean}/` : `${base}/`;
}

function isAbsolute(u) {
  return typeof u === "string" && /^https?:\/\//i.test(u);
}

function toUrl(pathOrUrl) {
  return isAbsolute(pathOrUrl) ? pathOrUrl : joinUrl(API_BASE, pathOrUrl);
}

async function doFetch(url, { method = "GET", body, headers = {}, credentials = "omit" } = {}) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    credentials,
  };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}

  if (!res.ok) {
    const err = new Error(json?.detail || res.statusText || "Request failed");
    err.status = res.status;
    err.body = json || text;
    throw err;
  }
  return json;
}

export function apiFetch(pathOrUrl, opts = {}) {
  const tokens = getTokens();
  const headers = { ...(opts.headers || {}) };
  if (tokens?.access) headers.Authorization = `Bearer ${tokens.access}`;
  const url = toUrl(pathOrUrl);
  return doFetch(url, { ...opts, headers, credentials: "omit" });
}

export function guestFetch(pathOrUrl, opts = {}) {
  const url = toUrl(pathOrUrl);
  return doFetch(url, { ...opts, credentials: "include" });
}

export const buildUrl = (path = "") => joinUrl(API_BASE, path);
