const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const TOKEN_KEY = "fashionx_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) =>
  token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);

export async function api(path, options = {}, canRetry = true) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Token ${token}` } : {}),
      ...options.headers,
    },
  });

  // An old or revoked login token: forget it and retry once as a guest
  if (res.status === 401 && token && canRetry && !path.startsWith("/auth/")) {
    setToken(null);
    window.dispatchEvent(new Event("fashionx-logout"));
    return api(path, options, false);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(`Request failed (${res.status})`);
    err.status = res.status;
    err.data = data; // field errors from Django, e.g. { phone: ["..."] }
    throw err;
  }
  return data;
}

export const formatPrice = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

// First readable message from a Django error body
export const firstError = (v) => (Array.isArray(v) ? (typeof v[0] === "string" ? v[0] : "") : typeof v === "string" ? v : "");
