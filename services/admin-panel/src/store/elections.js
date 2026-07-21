import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { API_BASE } from '../config'

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
      const response = await fetch(`${API_BASE}/api/elections/admin/all`, {
        credentials: 'include'
      })

      if (response.status === 401) {
        authStore.logout()
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch elections')
      }

      elections.value = await response.json()
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createElection(electionData) {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE}/api/elections`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(electionData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create election')
      }

      const newElection = await response.json()
      elections.value.push(newElection)
      return newElection
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateElectionStatus(electionId, status) {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE}/api/elections/${electionId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })

      if (!response.ok) {
        throw new Error('Failed to update election status')
      }

      await fetchElections()
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateElection(electionId, electionData) {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE}/api/elections/${electionId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(electionData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update election')
      }

      await fetchElections()
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteElection(electionId) {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE}/api/elections/${electionId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to delete election')
      }

      elections.value = elections.value.filter(e => e.id !== electionId)
    } catch (err) {
      error.value = err.message
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
