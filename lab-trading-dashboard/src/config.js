/**
 * API base URL for backend. Empty = same origin (local or cloud server).
 * No Render: we use only localhost (dev) or the cloud server (150.241.244.130:10000).
 */
function getApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL !== undefined) return import.meta.env.VITE_API_BASE_URL;
  // Same origin for local dev and for cloud server
  if (import.meta.env.MODE !== "production") return "";
  if (typeof window !== "undefined" && window.location?.origin) {
    const o = window.location.origin;
    if (o.startsWith("http://150.241.244.130") || o.startsWith("http://localhost") || o.startsWith("https://localhost")) return "";
  }
  // Production on unknown host: still use same origin if possible, else cloud server
  return "http://150.241.244.130:10000";
}

/** @deprecated Use getApiBaseUrl() or api() - kept for compatibility */
export const API_BASE_URL = typeof window !== "undefined" ? getApiBaseUrl() : "";

export { getApiBaseUrl };

export function api(path) {
  const base = getApiBaseUrl();
  return base ? `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}` : path;
}
