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
    ?.substring("csrf-token=".length);
  if (csrf) config.headers["x-csrf-token"] = csrf;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.displayMessage =
        "Cannot reach the server. Please check your connection and ensure the backend is running.";
    } else {
      const { status, data } = error.response;
      const rawMessage = data?.message || data?.error;

      switch (status) {
        case 400:
          error.displayMessage =
            rawMessage || "Invalid request. Please check your input.";
          break;
        case 401:
          error.displayMessage =
            rawMessage || "Authentication failed. Please log in again.";
          break;
        case 403:
          error.displayMessage =
            rawMessage || "You do not have permission to perform this action.";
          break;
        case 404:
          error.displayMessage =
            rawMessage || "The requested resource was not found.";
          break;
        case 429:
          error.displayMessage =
            rawMessage || "Too many requests. Please try again later.";
          break;
        case 500:
          error.displayMessage =
            rawMessage || "Server error. Please try again later.";
          break;
        case 502:
        case 503:
          error.displayMessage =
            "Service temporarily unavailable. Please try again later.";
          break;
        default:
          error.displayMessage =
            rawMessage || `Request failed (${status}). Please try again.`;
      }
    }
    return Promise.reject(error);
  },
);

export default api;
