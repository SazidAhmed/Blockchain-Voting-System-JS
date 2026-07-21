import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { API_BASE } from '../config'

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
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE}/api/elections/admin/audit-logs`, {
        credentials: 'include'
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
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE}/api/elections/admin/verify-audit-integrity/${logId}`, {
        method: 'POST',
        credentials: 'include'
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
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE}/api/elections/admin/security-logs`, {
        credentials: 'include'
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
    error.value = null

    try {
      const response = await fetch(`${API_BASE}/api/elections/admin/audit-logs/export?format=${format}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to export logs')
      }

      return await response.blob()
    } catch (err) {
      error.value = err.message
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
