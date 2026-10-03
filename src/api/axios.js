import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({ baseURL: API_URL });

// Admin review requests must not reuse a member token; admin authentication
// will be added when the admin account flow is ready.
api.interceptors.request.use((config) => {
  const isAdminRequest =
    config.url?.startsWith("/api/testimonials/admin");
  const token = isAdminRequest ? null : sessionStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
