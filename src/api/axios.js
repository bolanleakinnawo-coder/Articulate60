import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const isAdminRequest =
    config.url?.startsWith("/api/testimonials/admin") ||
    config.url?.startsWith("/api/admin/");
  const token = isAdminRequest ? null : localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // The admin panel's API needs the admin key (entered once per tab).
  if (isAdminRequest) {
    const adminKey = getAdminKey();
    if (adminKey) config.headers["X-Admin-Key"] = adminKey;
  }
  // Streak days and reminder times are worked out in the device's time zone.
  const timeZone = deviceTimeZone();
  if (timeZone && !isAdminRequest) config.headers["X-Time-Zone"] = timeZone;
  return config;
});

// A wrong or missing admin key sends the admin panel back to its key screen.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const code = error.response?.data?.code;
    if (code === "ADMIN_KEY") {
      setAdminKey(null);
      window.dispatchEvent(new Event("loquiex:admin-key"));
    }
    // The password was reset on another device, or the account was deleted:
    // this sign-in no longer works, so go back to the sign-in page.
    if (
      error.response?.status === 401 &&
      SESSION_ENDED_CODES[code] &&
      localStorage.getItem("token")
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.assign(`/login?session=${SESSION_ENDED_CODES[code]}`);
    }
    return Promise.reject(error);
  },
);

const SESSION_ENDED_CODES = {
  SESSION_REVOKED: "revoked",
  SESSION_EXPIRED: "expired",
  ACCOUNT_GONE: "deleted",
};

const ADMIN_KEY = "loquiex.adminKey";

export function getAdminKey() {
  try {
    return sessionStorage.getItem(ADMIN_KEY) || "";
  } catch {
    return "";
  }
}

export function setAdminKey(value) {
  try {
    if (value) sessionStorage.setItem(ADMIN_KEY, value);
    else sessionStorage.removeItem(ADMIN_KEY);
  } catch {
    // Storage blocked: the key is asked for again.
  }
}

export function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

export default api;
