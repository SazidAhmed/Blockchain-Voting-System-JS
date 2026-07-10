<template>
  <div class="audit-logs-section">
    <h3>📋 Admin Audit Logs</h3>
    
    <div class="logs-filters">
      <div class="filter-group">
        <label for="logFilter">Filter by Action:</label>
        <select v-model="selectedAction" id="logFilter" class="form-control">
          <option value="">All Actions</option>
          <option value="CREATE_ELECTION">Create Election</option>
          <option value="ADD_CANDIDATE">Add Candidate</option>
          <option value="DELETE_CANDIDATE">Delete Candidate</option>
          <option value="ACTIVATE_ELECTION">Activate Election</option>
          <option value="DEACTIVATE_ELECTION">Deactivate Election</option>
          <option value="LOCK_ELECTION">Lock Election</option>
          <option value="DELETE_ELECTION">Delete Election</option>
        </select>
      </div>

      <div class="filter-group">
        <label for="statusFilter">Filter by Status:</label>
        <select v-model="selectedStatus" id="statusFilter" class="form-control">
          <option value="">All</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <button @click="fetchLogs" class="btn btn-primary btn-small">Refresh</button>
    </div>

    <div v-if="loading" class="loading">Loading audit logs...</div>
    <div v-else-if="filteredLogs.length === 0" class="alert alert-info">No audit logs found</div>
    <div v-else class="logs-container">
      <div v-for="log in filteredLogs" :key="log.id" class="log-entry" :class="`status-${log.status}`">
        <div class="log-header">
          <span class="log-timestamp">{{ formatDate(log.timestamp) }}</span>
          <span class="log-action">{{ log.action_type }}</span>
          <span class="log-status" :class="{ success: log.status === 'success', failed: log.status === 'failed' }">
            {{ log.status.toUpperCase() }}
          </span>
        </div>

        <div class="log-details">
          <div class="detail-row">
            <span class="label">Resource:</span>
            <span class="value">{{ log.resource_type }} #{{ log.resource_id }}</span>
          </div>
          <div class="detail-row">
            <span class="label">IP Address:</span>
            <span class="value">{{ log.ip_address }}</span>
          </div>

          <div v-if="log.changes" class="detail-row">
            <span class="label">Changes:</span>
            <pre class="value changes">{{ formatJson(log.changes) }}</pre>
          </div>

          <div v-if="log.reason" class="detail-row">
            <span class="label">Reason:</span>
            <span class="value error">{{ log.reason }}</span>
          </div>

          <div class="detail-row">
            <span class="label">Hash:</span>
            <span class="value monospace">{{ log.change_hash?.substring(0, 16) }}...</span>
            <button @click="verifyIntegrity(log.id)" class="btn btn-small btn-secondary">
              Verify
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="pagination">
      <button @click="previousPage" class="btn btn-secondary btn-small" :disabled="offset === 0">Previous</button>
      <span>Page {{ currentPage }} of {{ totalPages }}</span>
      <button @click="nextPage" class="btn btn-secondary btn-small" :disabled="offset + limit >= total">Next</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AdminAuditLogs',
  data() {
    return {
      logs: [],
      selectedAction: '',
      selectedStatus: '',
      loading: false,
      limit: 20,
      offset: 0,
      total: 0
    }
  },
  computed: {
    currentPage() {
      return Math.floor(this.offset / this.limit) + 1
    },
    totalPages() {
      return Math.ceil(this.total / this.limit)
    },
    filteredLogs() {
      return this.logs.filter(log => {
        const actionMatch = !this.selectedAction || log.action_type === this.selectedAction
        const statusMatch = !this.selectedStatus || log.status === this.selectedStatus
        return actionMatch && statusMatch
      })
    }
  },
  methods: {
    async fetchLogs() {
      this.loading = true
      try {
        const response = await fetch(`http://localhost:3000/api/elections/admin/audit-logs?limit=${this.limit}&offset=${this.offset}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        if (!response.ok) throw new Error('Failed to fetch logs')
        this.logs = await response.json()
        this.total = this.logs.length // In production, get total from response
      } catch (err) {
        console.error('Error fetching logs:', err)
      } finally {
        this.loading = false
      }
    },
    async verifyIntegrity(logId) {
      try {
        const response = await fetch(`http://localhost:3000/api/elections/admin/verify-audit-integrity/${logId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        const result = await response.json()
        
        if (result.valid) {
          alert(`✓ Audit log #${logId} integrity verified - Hash matches`)
        } else {
          alert(`✗ Audit log #${logId} integrity check failed - ${result.reason}`)
        }
      } catch (err) {
        alert('Error verifying integrity: ' + err.message)
      }
    },
    formatDate(dateString) {
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    },
    formatJson(jsonString) {
      try {
        return JSON.stringify(JSON.parse(jsonString), null, 2)
      } catch {
        return jsonString
      }
    },
    nextPage() {
      this.offset += this.limit
      this.fetchLogs()
    },
    previousPage() {
      if (this.offset >= this.limit) {
        this.offset -= this.limit
        this.fetchLogs()
      }
    }
  },
  mounted() {
    this.fetchLogs()
  }
}
</script>

<style scoped>
.audit-logs-section {
  margin-top: 40px;
}

.audit-logs-section h3 {
  margin-top: 0;
  color: #2c3e50;
  border-bottom: 2px solid #667eea;
  padding-bottom: 15px;
}

.logs-filters {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.filter-group label {
  font-weight: 600;
  color: #2c3e50;
}

.filter-group .form-control {
  min-width: 180px;
}

.logs-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.log-entry {
  background: white;
  border-left: 4px solid #667eea;
  padding: 15px;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.log-entry.status-failed {
  border-left-color: #dc3545;
  background-color: #fff5f5;
}

.log-entry.status-success {
  border-left-color: #2ecc71;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 10px;
}

.log-timestamp {
  font-size: 0.85rem;
  color: #7f8c8d;
}

.log-action {
  font-weight: 600;
  color: #2c3e50;
  background-color: #f0f0f0;
  padding: 4px 8px;
  border-radius: 4px;
}

.log-status {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.log-status.success {
  background-color: #d4edda;
  color: #155724;
}

.log-status.failed {
  background-color: #f8d7da;
  color: #721c24;
}

.log-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.detail-row .label {
  font-weight: 600;
  color: #34495e;
  min-width: 100px;
}

.detail-row .value {
  color: #2c3e50;
  flex: 1;
}

.detail-row .value.error {
  color: #dc3545;
}

.detail-row .value.monospace {
  font-family: 'Courier New', monospace;
  background-color: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9rem;
}

.detail-row .value.changes {
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  font-size: 0.85rem;
  max-height: 200px;
  overflow-y: auto;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
}

.pagination {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 20px;
  align-items: center;
}

.btn {
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-primary {
  background-color: #667eea;
  color: white;
}

.btn-primary:hover {
  background-color: #5568d3;
}

.btn-secondary {
  background-color: #e8e8f0;
  color: #2c3e50;
}

.btn-secondary:hover {
  background-color: #d8d8e0;
}

.btn-small {
  padding: 6px 10px;
  font-size: 0.8rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.alert {
  padding: 15px;
  border-radius: 6px;
  background-color: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}
</style>
