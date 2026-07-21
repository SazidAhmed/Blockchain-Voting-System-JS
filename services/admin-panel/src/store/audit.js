import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../services/api'

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
      const { data } = await api.get('/elections/admin/audit-logs')
      auditLogs.value = data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to fetch audit logs'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function verifyLogIntegrity(logId) {
    loading.value = true
    error.value = null

    try {
      const { data } = await api.post(`/elections/admin/verify-audit-integrity/${logId}`)
      return data.isValid
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to verify log integrity'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function verifyBlockchainIntegrity() {
    loading.value = true
    error.value = null

    try {
      const { data } = await api.get('/elections/admin/security-logs')
      return data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to verify blockchain integrity'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function exportLogs(format = 'json') {
    error.value = null

    try {
      const { data } = await api.get(`/elections/admin/audit-logs/export?format=${format}`, {
        responseType: 'blob'
      })
      return data
    } catch (err) {
      error.value = err.response?.data?.message || 'Failed to export logs'
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
