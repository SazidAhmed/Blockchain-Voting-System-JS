// TODO (ARCH-016): Migrate from Vuex to Pinia. Pinia is the official Vue 3 state management library.
// Vuex is in maintenance mode. Migration involves: replacing createStore with defineStore,
// replacing mutations with actions, and converting getters to computed properties.
import api from "@/services/api";
import keyManager from "@/services/keyManager";
import { createStore } from "vuex";

export default createStore({
  state: {
    user: (() => {
      try {
        return JSON.parse(localStorage.getItem("voter_user"));
      } catch {
        return null;
      }
    })(),
    elections: [],
    currentElection: null,
    loading: false,
    error: null,
    keyLoadError: null,
  },
  getters: {
    isAuthenticated: (state) => !!state.user,
    currentUser: (state) => state.user,
    getElections: (state) => state.elections,
    getCurrentElection: (state) => state.currentElection,
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
    getKeyLoadError: (state) => state.keyLoadError,
  },
  mutations: {
    SET_USER(state, user) {
      state.user = user;
      if (user) {
        localStorage.setItem("voter_user", JSON.stringify(user));
      } else {
        localStorage.removeItem("voter_user");
      }
    },
    CLEAR_AUTH(state) {
      state.user = null;
      localStorage.removeItem("voter_user");
    },
    SET_ELECTIONS(state, elections) {
      state.elections = elections;
    },
    SET_CURRENT_ELECTION(state, election) {
      state.currentElection = election;
    },
    SET_LOADING(state, status) {
      state.loading = status;
    },
    SET_ERROR(state, error) {
      state.error = error;
    },
    CLEAR_ERROR(state) {
      state.error = null;
    },
    SET_KEY_LOAD_ERROR(state, error) {
      state.keyLoadError = error;
    },
    CLEAR_KEY_LOAD_ERROR(state) {
      state.keyLoadError = null;
    },
  },
  actions: {
    // Auth actions
    async register({ commit }, userData) {
      commit("SET_LOADING", true);
      commit("CLEAR_ERROR");
      try {
        const response = await api.post("/users/register", userData);
        return response.data;
      } catch (error) {
        commit(
          "SET_ERROR",
          error.displayMessage ||
            error.response?.data?.message ||
            "Registration failed. Please try again.",
        );
        throw error;
      } finally {
        commit("SET_LOADING", false);
      }
    },

    async login({ commit }, credentials) {
      commit("SET_LOADING", true);
      commit("CLEAR_ERROR");
      try {
        const response = await api.post("/users/login", {
          ...credentials,
          loginType: "voter",
        });
        commit("SET_USER", response.data.user);

        // Load user's cryptographic keys
        try {
          const userId = (
            response.data.user.institutionId ||
            response.data.user.id ||
            ""
          ).toUpperCase();
          await keyManager.loadUserKeys(userId, credentials.password);
          console.log("✅ User keys loaded successfully");
        } catch (keyError) {
          console.warn("⚠️ Failed to load user keys:", keyError);
          commit(
            "SET_KEY_LOAD_ERROR",
            "Failed to load cryptographic keys. Some features may be unavailable.",
          );
          // Don't fail login if keys can't be loaded
          // User might need to regenerate them
        }

        return response.data;
      } catch (error) {
        commit(
          "SET_ERROR",
          error.displayMessage ||
            error.response?.data?.message ||
            "Login failed. Please check your ID and password.",
        );
        throw error;
      } finally {
        commit("SET_LOADING", false);
      }
    },

    async fetchCurrentUser({ commit, state }) {
      if (!state.user) return;

      commit("SET_LOADING", true);
      try {
        const response = await api.get("/users/me");
        commit("SET_USER", response.data);
        return response.data;
      } catch (error) {
        commit("CLEAR_AUTH");
        commit(
          "SET_ERROR",
          error.displayMessage || "Session expired. Please login again.",
        );
      } finally {
        commit("SET_LOADING", false);
      }
    },

    logout({ commit }) {
      commit("CLEAR_AUTH");
      // Clear cryptographic keys from memory
      keyManager.clearKeys();
    },

    // Reload cryptographic keys from localStorage on app init
    restoreKeys({ commit, state }) {
      if (!state.user) {
        const savedUser = localStorage.getItem("voter_user");
        if (savedUser) {
          commit("SET_USER", JSON.parse(savedUser));
        }
      }
      const user = state.user;
      if (!user) return;

      const userId = (
        user.institutionId ||
        user.studentId ||
        user.id ||
        ""
      ).toUpperCase();
      if (!userId) return;

      if (keyManager.getCurrentKeys()) return;

      if (keyManager.hasStoredKeys(userId)) {
        keyManager.loadUserKeys(userId, "").catch(() => {});
      }
    },

    // Election actions
    async fetchElections({ commit }, options = {}) {
      const { silent = false } = options;
      if (!silent) {
        commit("SET_LOADING", true);
      }
      commit("CLEAR_ERROR");
      try {
        const response = await api.get("/elections");
        commit("SET_ELECTIONS", response.data);
        return response.data;
      } catch (error) {
        commit(
          "SET_ERROR",
          error.displayMessage ||
            error.response?.data?.message ||
            "Failed to fetch elections. Please try again.",
        );
        throw error;
      } finally {
        if (!silent) {
          commit("SET_LOADING", false);
        }
      }
    },

    async fetchElection({ commit }, electionId) {
      commit("SET_LOADING", true);
      commit("CLEAR_ERROR");
      try {
        const response = await api.get(`/elections/${electionId}`);
        commit("SET_CURRENT_ELECTION", response.data);
        return response.data;
      } catch (error) {
        commit(
          "SET_ERROR",
          error.displayMessage ||
            error.response?.data?.message ||
            "Failed to fetch election details. Please try again.",
        );
        throw error;
      } finally {
        commit("SET_LOADING", false);
      }
    },

    async createElection({ commit }, electionData) {
      commit("SET_LOADING", true);
      commit("CLEAR_ERROR");
      try {
        const response = await api.post("/elections", electionData);
        return response.data;
      } catch (error) {
        commit(
          "SET_ERROR",
          error.displayMessage ||
            error.response?.data?.message ||
            "Failed to create election. Please try again.",
        );
        throw error;
      } finally {
        commit("SET_LOADING", false);
      }
    },

    async registerForElection({ commit }, electionId) {
      commit("SET_LOADING", true);
      commit("CLEAR_ERROR");
      try {
        const response = await api.post(`/elections/${electionId}/register`);
        return response.data;
      } catch (error) {
        commit(
          "SET_ERROR",
          error.displayMessage ||
            error.response?.data?.message ||
            "Failed to register for election. Please try again.",
        );
        throw error;
      } finally {
        commit("SET_LOADING", false);
      }
    },

    async castVote({ commit }, { electionId, voteData }) {
      commit("SET_LOADING", true);
      commit("CLEAR_ERROR");
      try {
        const response = await api.post(
          `/elections/${electionId}/vote`,
          voteData,
        );
        return response.data;
      } catch (error) {
        commit(
          "SET_ERROR",
          error.displayMessage ||
            error.response?.data?.message ||
            "Failed to cast vote. Please try again.",
        );
        throw error;
      } finally {
        commit("SET_LOADING", false);
      }
    },

    async updateElectionStatus({ commit }, { electionId, status }) {
      commit("SET_LOADING", true);
      commit("CLEAR_ERROR");
      try {
        const response = await api.patch(`/elections/${electionId}/status`, {
          status,
        });
        return response.data;
      } catch (error) {
        commit(
          "SET_ERROR",
          error.displayMessage ||
            error.response?.data?.message ||
            "Failed to update election status. Please try again.",
        );
        throw error;
      } finally {
        commit("SET_LOADING", false);
      }
    },
  },
});
