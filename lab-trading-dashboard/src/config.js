/** Cloud API (direct IP). Use tunnel URL in .env.local if this isn't reachable from your network. */
const CLOUD_API = "http://150.241.244.130:10000";

/** Set by runtime config (api-config.json) when loaded — so GitHub Pages keeps working after cloud reboot */
let runtimeApiBaseUrl = null;

/** Build-time default (env or cloud IP). */
function getBuildTimeDefault() {
  let base = import.meta.env.VITE_API_BASE_URL;
  if (base !== undefined && base !== "") {
    if (typeof window !== "undefined" && window.location?.protocol === "https:" && base.startsWith("http://")) {
      base = "https://" + base.slice(7);
    }
    return base;
  }
  if (import.meta.env.MODE !== "production") return CLOUD_API;
  if (typeof window !== "undefined" && window.location?.origin) {
    const o = window.location.origin;
    if (o.startsWith("http://150.241.244.130") || o.startsWith("http://localhost") || o.startsWith("https://localhost")) return "";
  }
  if (typeof window !== "undefined" && window.location?.protocol === "https:") return "https://150.241.244.130:10000";
  return CLOUD_API;
}

/**
 * API base URL for backend. In production (e.g. GitHub Pages) we also load api-config.json at runtime
 * so the URL can be updated after a cloud reboot without redeploying.
 */
function getApiBaseUrl() {
  if (runtimeApiBaseUrl) return runtimeApiBaseUrl;
  return getBuildTimeDefault();
}

/** Load API URL from api-config.json (used on GitHub Pages so data works after cloud restart). */
function loadRuntimeApiConfig() {
  if (typeof window === "undefined") return Promise.resolve();
  const url = new URL("api-config.json", window.location.href).href;
  return fetch(url, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (j && typeof j.apiBaseUrl === "string" && j.apiBaseUrl) {
        runtimeApiBaseUrl = j.apiBaseUrl.replace(/\/$/, "");
        window.dispatchEvent(new Event("api-config-loaded"));
      }
    })
    .catch(() => {});
}

// Start loading runtime config when in browser (no await — app can use build-time default until it loads)
if (typeof window !== "undefined") loadRuntimeApiConfig();

/** @deprecated Use getApiBaseUrl() or api() so runtime config is used */
export const API_BASE_URL = typeof window !== "undefined" ? getApiBaseUrl() : "";

export { getApiBaseUrl, loadRuntimeApiConfig };

export function api(path) {
  const base = getApiBaseUrl();
  return base ? `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}` : path;
}
