/**
 * API base URL for backend. Empty = same origin.
 * When the page is HTTPS (e.g. GitHub Pages), the API URL must be HTTPS too (mixed content is blocked).
 */
function getApiBaseUrl() {
  let base = import.meta.env.VITE_API_BASE_URL;
  if (base !== undefined && base !== "") {
    // If page is HTTPS, force API to HTTPS to avoid mixed-content block
    if (typeof window !== "undefined" && window.location?.protocol === "https:" && base.startsWith("http://")) {
      base = "https://" + base.slice(7);
    }
    return base;
  }
  if (import.meta.env.MODE !== "production") return "";
  if (typeof window !== "undefined" && window.location?.origin) {
    const o = window.location.origin;
    if (o.startsWith("http://150.241.244.130") || o.startsWith("http://localhost") || o.startsWith("https://localhost")) return "";
  }
  // Production: use cloud server; HTTPS page must use HTTPS API
  const cloud = "http://150.241.244.130:10000";
  if (typeof window !== "undefined" && window.location?.protocol === "https:") {
    return "https://150.241.244.130:10000";
  }
  return cloud;
}

/** @deprecated Use getApiBaseUrl() or api() - kept for compatibility */
export const API_BASE_URL = typeof window !== "undefined" ? getApiBaseUrl() : "";

export { getApiBaseUrl };

export function api(path) {
  const base = getApiBaseUrl();
  return base ? `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}` : path;
}
