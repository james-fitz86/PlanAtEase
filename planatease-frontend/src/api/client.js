import { getTokens } from "../auth/storage"; 

const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL;
const API_BASE = (RAW_API_BASE || "").replace(/\/+$/, "");

export function buildUrl(path = "") {
  const clean = String(path || "").replace(/^\/+/, "");
  return clean ? `${API_BASE}/${clean}/` : `${API_BASE}/`;
}

function parseJson(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

const GUEST_KEY = "guest_id";

export async function guestFetch(url, opts = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };

  const tokens = getTokens?.();
  if (tokens?.access && !headers.Authorization) {
    headers.Authorization = `Bearer ${tokens.access}`;
  }

  const gid = localStorage.getItem(GUEST_KEY);
  if (gid && !headers["X-Guest-Id"]) headers["X-Guest-Id"] = gid;

  const res = await fetch(url, {
    method: opts.method || "GET",
    headers,
    credentials: "include",
    mode: "cors",
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  const json = parseJson(text);

  const resGid = res.headers.get("X-Guest-Id");
  if (resGid) {
    try {
      localStorage.setItem(GUEST_KEY, resGid);
    } catch {}
  }

  if (!res.ok) {
    const err = new Error(json?.detail || res.statusText || "Request failed");
    err.status = res.status;
    err.body = json || text;
    throw err;
  }

  return json;
}