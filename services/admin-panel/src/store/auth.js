import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { API_BASE } from "../config";

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
      const response = await fetch(`${API_BASE}/api/users/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...credentials, loginType: "admin" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }

      const data = await response.json();
      user.value = data.user;

      localStorage.setItem("user", JSON.stringify(data.user));

      return data;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchCurrentUser() {
    if (!user.value) return;

    loading.value = true;
    try {
      const response = await fetch(`${API_BASE}/api/users/me`, {
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to fetch user");
      user.value = await response.json();
      return user.value;
    } catch (err) {
      error.value = err.message;
      logout();
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    user.value = null;
    localStorage.removeItem("user");
    error.value = null;
  }

  function clearError() {
    error.value = null;
  }

  // Initialize from localStorage
  function initializeAuth() {
    const storedUser = localStorage.getItem("user");

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
