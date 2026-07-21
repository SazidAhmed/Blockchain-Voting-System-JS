import { createStore } from 'vuex'
import axios from 'axios'
import keyManager from '@/services/keyManager'

// Configure axios
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api`,
  withCredentials: true
})

export default createStore({
  state: {
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    elections: [],
    currentElection: null,
    loading: false,
    error: null
  },
  getters: {
    isAuthenticated: state => !!state.user,
    currentUser: state => state.user,
    getElections: state => state.elections,
    getCurrentElection: state => state.currentElection,
    isLoading: state => state.loading,
    getError: state => state.error
  },
  mutations: {
    SET_USER(state, user) {
      state.user = user
      if (user) {
        localStorage.setItem('user', JSON.stringify(user))
      } else {
        localStorage.removeItem('user')
      }
    },
    CLEAR_AUTH(state) {
      state.user = null
      localStorage.removeItem('user')
    },
    SET_ELECTIONS(state, elections) {
      state.elections = elections
    },
    SET_CURRENT_ELECTION(state, election) {
      state.currentElection = election
    },
    SET_LOADING(state, status) {
      state.loading = status
    },
    SET_ERROR(state, error) {
      state.error = error
    },
    CLEAR_ERROR(state) {
      state.error = null
    }
  },
  actions: {
    // Auth actions
    async register({ commit }, userData) {
      commit('SET_LOADING', true)
      commit('CLEAR_ERROR')
      try {
        const response = await api.post('/users/register', userData)
        return response.data
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.message || 'Registration failed')
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async login({ commit }, credentials) {
      commit('SET_LOADING', true)
      commit('CLEAR_ERROR')
      try {
        const response = await api.post('/users/login', { ...credentials, loginType: 'voter' })
        commit('SET_USER', response.data.user)
        
        // Load user's cryptographic keys
        try {
          const userId = (response.data.user.institutionId || response.data.user.id || '').toUpperCase()
          await keyManager.loadUserKeys(userId, credentials.password)
          console.log('✅ User keys loaded successfully')
        } catch (keyError) {
          console.warn('⚠️ Failed to load user keys:', keyError)
          // Don't fail login if keys can't be loaded
          // User might need to regenerate them
        }
        
        return response.data
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.message || 'Login failed')
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async fetchCurrentUser({ commit, state }) {
      if (!state.user) return
      
      commit('SET_LOADING', true)
      try {
        const response = await api.get('/users/me')
        commit('SET_USER', response.data)
        return response.data
      } catch (error) {
        commit('CLEAR_AUTH')
        commit('SET_ERROR', 'Session expired. Please login again.')
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    logout({ commit }) {
      commit('CLEAR_AUTH')
      // Clear cryptographic keys from memory
      keyManager.clearKeys()
    },

    // Reload cryptographic keys from localStorage on app init
    restoreKeys({ commit, state }) {
      if (!state.user) {
        const savedUser = localStorage.getItem('user')
        if (savedUser) {
          commit('SET_USER', JSON.parse(savedUser))
        }
      }
      const user = state.user
      if (!user) return

      const userId = (user.institutionId || user.studentId || user.id || '').toUpperCase()
      if (!userId) return

      if (keyManager.getCurrentKeys()) return

      if (keyManager.hasStoredKeys(userId)) {
        keyManager.loadUserKeys(userId, '').catch(() => {})
      }
    },
    
    // Election actions
    async fetchElections({ commit }) {
      commit('SET_LOADING', true)
      commit('CLEAR_ERROR')
      try {
        const response = await api.get('/elections')
        commit('SET_ELECTIONS', response.data)
        return response.data
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.message || 'Failed to fetch elections')
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async fetchElection({ commit }, electionId) {
      commit('SET_LOADING', true)
      commit('CLEAR_ERROR')
      try {
        const response = await api.get(`/elections/${electionId}`)
        commit('SET_CURRENT_ELECTION', response.data)
        return response.data
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.message || 'Failed to fetch election details')
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async createElection({ commit }, electionData) {
      commit('SET_LOADING', true)
      commit('CLEAR_ERROR')
      try {
        const response = await api.post('/elections', electionData)
        return response.data
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.message || 'Failed to create election')
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async registerForElection({ commit }, electionId) {
      commit('SET_LOADING', true)
      commit('CLEAR_ERROR')
      try {
        const response = await api.post(`/elections/${electionId}/register`)
        return response.data
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.message || 'Failed to register for election')
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async castVote({ commit }, { electionId, voteData }) {
      commit('SET_LOADING', true)
      commit('CLEAR_ERROR')
      try {
        const response = await api.post(`/elections/${electionId}/vote`, voteData)
        return response.data
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.message || 'Failed to cast vote')
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },
    
    async updateElectionStatus({ commit }, { electionId, status }) {
      commit('SET_LOADING', true)
      commit('CLEAR_ERROR')
      try {
        const response = await api.put(`/elections/${electionId}/status`, { status })
        return response.data
      } catch (error) {
        commit('SET_ERROR', error.response?.data?.message || 'Failed to update election status')
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    }
  }
})