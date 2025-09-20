import axios from "axios";
import { getTokens, setTokens, clearTokens } from "./auth/storage";
import { scheduleFromAccess } from "./auth/scheduler";
import { setMeta, getMeta } from "./auth/storage";

// Creates an Axios instance
const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});


// Request interceptor
API.interceptors.request.use((config) => {
  const url = config.url || "";
  const isPublic =
    url.includes("/auth/jwt/create/") ||
    url.includes("/auth/jwt/refresh/") ||
    url.includes("/auth/register/");

  if (!isPublic) {
    const tokens = getTokens();
    if (tokens?.access) {
      config.headers.Authorization = `Bearer ${tokens.access}`;
    }
  } else {
    if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }
  }

  return config;
});

// Handle token refresh state
let isRefreshing = false;

let queue = [];

function processQueue(err, newAccess = null) {
  queue.forEach(({ resolve, reject, config }) => {
    if (err) {
      reject(err);
    } else {
      config.headers.Authorization = `Bearer ${newAccess}`;
      resolve(API(config));
    }
  });
  queue = [];
}

// Response inerceptor
API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (!error.response) return Promise.reject(error);

    if (error.response.status !== 401) return Promise.reject(error);

    const isAuthEndpoint =
      original?.url?.includes("/auth/jwt/create/") ||
      original?.url?.includes("/auth/register/");

    if (isAuthEndpoint) return Promise.reject(error);

    if (original._retry) return Promise.reject(error);
    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject, config: original });
      });
    }

    isRefreshing = true;

    try {
      const tokens = getTokens();
      if (!tokens?.refresh) throw new Error("No refresh token available");

      const { data } = await axios.post(
        `${API.defaults.baseURL}/auth/jwt/refresh/`,
        { refresh: tokens.refresh },
        { headers: { "Content-Type": "application/json" } }
      );

      if (!data?.access) throw new Error("Refresh succeeded but no access token returned");

      const newTokens = {
        access: data.access,
        refresh: data.refresh || tokens.refresh,
      };
      setTokens(newTokens);
      scheduleFromAccess(newTokens.access);

      API.defaults.headers.Authorization = `Bearer ${newTokens.access}`;

      processQueue(null, newTokens.access);

      return API(original);
    } catch (e) {
      clearTokens();
      processQueue(e, null);

      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);

// Authentication Helpers

export async function login(email, password) {
    const { data } = await API.post("/auth/jwt/create/", { email, password });
    setTokens({ access: data.access, refresh: data.refresh });
    const meta = getMeta();
    if (!meta.firstLoginAt) {
      setMeta({ firstLoginAt: Date.now() });
    }
    return data; 
}


export async function me() {
  const { data } = await API.get("/auth/me/");
  return data;
}

export async function updateMe(patch) {
  const { data } = await API.patch("/auth/me/", patch);
  return data;
}

export function logout() {
  clearTokens();
  if (window.location.pathname !== "/logout-success") {
    window.location.assign("/logout-success");
  }
}

export async function register(form) {
  const { data } = await API.post("/auth/register/", form);
  return data;
}

export default API;