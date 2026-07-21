import axios from "axios";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const csrf = document.cookie
    .split("; ")
    .find((r) => r.startsWith("csrf-token="))
    ?.split("=")[1];
  if (csrf) config.headers["x-csrf-token"] = csrf;
  return config;
});

export default api;
