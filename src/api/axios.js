import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({ baseURL: API_URL });

// Every request automatically carries the logged-in user's token —
// no need to attach it manually in each component.
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
