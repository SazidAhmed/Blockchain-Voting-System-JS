import axios from "axios";
import { API_BASE } from "../config";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
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
