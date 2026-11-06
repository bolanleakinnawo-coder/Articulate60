import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const isAdminRequest =
    config.url?.startsWith("/api/testimonials/admin") ||
    config.url?.startsWith("/api/admin/");
  const token = isAdminRequest ? null : sessionStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Streak days and reminder times are worked out in the device's time zone.
  const timeZone = deviceTimeZone();
  if (timeZone && !isAdminRequest) config.headers["X-Time-Zone"] = timeZone;
  return config;
});

export function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

export default api;
