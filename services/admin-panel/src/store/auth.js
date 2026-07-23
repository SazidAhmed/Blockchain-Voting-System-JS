import { defineStore } from "pinia";
import { computed, ref } from "vue";
import api from "../services/api";

export const useAuthStore = defineStore("auth", () => {
  // State
  const user = ref(null);
  const loading = ref(false);
  const error = ref(null);

  // Computed
  const isAuthenticated = computed(() => !!user.value);
  const isAdmin = computed(() => user.value && user.value.role === "admin");
  const currentUser = computed(() => user.value);

  // Actions
  async function login(credentials) {
    loading.value = true;
    error.value = null;
    try {
      const { data } = await api.post("/users/login", {
        ...credentials,
        loginType: "admin",
      });

      user.value = data.user;
      localStorage.setItem("admin_user", JSON.stringify(data.user));
      localStorage.setItem("admin_token", data.token);

      return data;
    } catch (err) {
      error.value =
        err.displayMessage ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Login failed. Please try again.";
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchCurrentUser() {
    if (!user.value) return;

    loading.value = true;
    try {
      const { data } = await api.get("/users/me");
      user.value = data;
      return user.value;
    } catch (err) {
      error.value =
        err.displayMessage ||
        err.response?.data?.message ||
        "Failed to fetch user.";
      logout();
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    user.value = null;
    localStorage.removeItem("admin_user");
    localStorage.removeItem("admin_token");
    error.value = null;
  }

  function clearError() {
    error.value = null;
  }

  // Initialize from localStorage
  function initializeAuth() {
    const storedUser = localStorage.getItem("admin_user");

    if (storedUser) {
      try {
        user.value = JSON.parse(storedUser);
      } catch (e) {
        console.error("Failed to parse stored user", e);
      }
    }
  }

  return {
    // State
    user,
    loading,
    error,
    // Computed
    isAuthenticated,
    isAdmin,
    currentUser,
    // Actions
    login,
    logout,
    fetchCurrentUser,
    clearError,
    initializeAuth,
  };
});
