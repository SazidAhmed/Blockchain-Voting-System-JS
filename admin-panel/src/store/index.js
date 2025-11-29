import { createStore } from 'vuex'

export default createStore({
  state: {
    user: null,
    token: localStorage.getItem('token') || null,
    loading: false,
    error: null
  },
  getters: {
    isAuthenticated: state => !!state.token,
    currentUser: state => state.user,
    isLoading: state => state.loading,
    getError: state => state.error
  },
  mutations: {
    SET_USER(state, user) {
      state.user = user
    },
    SET_TOKEN(state, token) {
      state.token = token
      if (token) {
        localStorage.setItem('token', token)
      } else {
        localStorage.removeItem('token')
      }
    },
    SET_LOADING(state, loading) {
      state.loading = loading
    },
    SET_ERROR(state, error) {
      state.error = error
    },
    CLEAR_ERROR(state) {
      state.error = null
    },
    CLEAR_AUTH(state) {
      state.user = null
      state.token = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  },
  actions: {
    async login({ commit }, credentials) {
      commit('SET_LOADING', true)
      commit('CLEAR_ERROR')
      try {
        const response = await fetch('http://localhost:3000/api/users/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(credentials)
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'Login failed')
        }

        const data = await response.json()
        commit('SET_USER', data.user)
        commit('SET_TOKEN', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        return data
      } catch (error) {
        commit('SET_ERROR', error.message)
        throw error
      } finally {
        commit('SET_LOADING', false)
      }
    },

    logout({ commit }) {
      commit('CLEAR_AUTH')
    }
  }
})
