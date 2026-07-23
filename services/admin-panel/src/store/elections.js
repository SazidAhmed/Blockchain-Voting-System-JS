import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import api from '../services/api'

export const useElectionsStore = defineStore('elections', () => {
  // State
  const elections = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Getters
  const getElections = computed(() => elections.value)
  const electionsCount = computed(() => elections.value.length)

  // Actions
  async function fetchElections() {
    const authStore = useAuthStore()
    loading.value = true
    error.value = null

    try {
      const { data } = await api.get('/elections/admin/all')
      elections.value = data
    } catch (err) {
      if (err.response?.status === 401) {
        authStore.logout()
        return
      }
      error.value = err.displayMessage || err.response?.data?.message || 'Failed to fetch elections. Please try again.'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createElection(electionData) {
    loading.value = true
    error.value = null

    try {
      const { data: newElection } = await api.post('/elections', electionData)
      elections.value.push(newElection)
      return newElection
    } catch (err) {
      error.value = err.displayMessage || err.response?.data?.message || 'Failed to create election. Please try again.'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateElectionStatus(electionId, status) {
    loading.value = true
    error.value = null

    try {
      await api.patch(`/elections/${electionId}/status`, { status })
      await fetchElections()
    } catch (err) {
      error.value = err.displayMessage || err.response?.data?.message || 'Failed to update election status. Please try again.'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateElection(electionId, electionData) {
    loading.value = true
    error.value = null

    try {
      await api.put(`/elections/${electionId}`, electionData)
      await fetchElections()
    } catch (err) {
      error.value = err.displayMessage || err.response?.data?.message || 'Failed to update election. Please try again.'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteElection(electionId) {
    loading.value = true
    error.value = null

    try {
      await api.delete(`/elections/${electionId}`)
      elections.value = elections.value.filter(e => e.id !== electionId)
    } catch (err) {
      error.value = err.displayMessage || err.response?.data?.message || 'Failed to delete election. Please try again.'
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    // State
    elections,
    loading,
    error,
    // Getters
    getElections,
    electionsCount,
    // Actions
    fetchElections,
    createElection,
    updateElection,
    updateElectionStatus,
    deleteElection,
    clearError
  }
})
