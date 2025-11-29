import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'

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
      const response = await fetch('http://localhost:3000/api/elections/admin/all', {
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      })

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
    const authStore = useAuthStore()
    loading.value = true
    error.value = null

    try {
      const response = await fetch('http://localhost:3000/api/elections', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authStore.token}`,
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
    const authStore = useAuthStore()
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`http://localhost:3000/api/elections/${electionId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authStore.token}`,
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

  async function deleteElection(electionId) {
    const authStore = useAuthStore()
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`http://localhost:3000/api/elections/${electionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
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
    updateElectionStatus,
    deleteElection,
    clearError
  }
})
