import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'

export const useAuditStore = defineStore('audit', () => {
  // State
  const auditLogs = ref([])
  const loading = ref(false)
  const error = ref(null)
  const filters = ref({
    action: '',
    adminId: '',
    startDate: '',
    endDate: ''
  })

  // Getters
  const getLogs = computed(() => auditLogs.value)
  const getFilteredLogs = computed(() => {
    return auditLogs.value.filter(log => {
      if (filters.value.action && log.action !== filters.value.action) {
        return false
      }
      if (filters.value.adminId && log.admin_id !== filters.value.adminId) {
        return false
      }
      if (filters.value.startDate && new Date(log.timestamp) < new Date(filters.value.startDate)) {
        return false
      }
      if (filters.value.endDate && new Date(log.timestamp) > new Date(filters.value.endDate)) {
        return false
      }
      return true
    })
  })
  const logsCount = computed(() => auditLogs.value.length)
  const filteredLogsCount = computed(() => getFilteredLogs.value.length)

  // Actions
  async function fetchAuditLogs() {
    const authStore = useAuthStore()
    loading.value = true
    error.value = null

    try {
      const response = await fetch('http://localhost:3000/api/elections/admin/audit-logs', {
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs')
      }

      auditLogs.value = await response.json()
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function verifyLogIntegrity(logId) {
    const authStore = useAuthStore()
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`http://localhost:3000/api/elections/admin/verify-audit-integrity/${logId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to verify log integrity')
      }

      const result = await response.json()
      return result.isValid
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function verifyBlockchainIntegrity() {
    const authStore = useAuthStore()
    loading.value = true
    error.value = null

    try {
      const response = await fetch('http://localhost:3000/api/elections/admin/security-logs', {
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to verify blockchain integrity')
      }

      return await response.json()
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function exportLogs(format = 'json') {
    const authStore = useAuthStore()
    error.value = null

    try {
      const response = await fetch(`http://localhost:3000/api/elections/admin/audit-logs/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to export logs')
      }

      return await response.blob()
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  function setFilter(filterKey, value) {
    filters.value[filterKey] = value
  }

  function clearFilters() {
    filters.value = {
      action: '',
      adminId: '',
      startDate: '',
      endDate: ''
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    // State
    auditLogs,
    loading,
    error,
    filters,
    // Getters
    getLogs,
    getFilteredLogs,
    logsCount,
    filteredLogsCount,
    // Actions
    fetchAuditLogs,
    verifyLogIntegrity,
    verifyBlockchainIntegrity,
    exportLogs,
    setFilter,
    clearFilters,
    clearError
  }
})
