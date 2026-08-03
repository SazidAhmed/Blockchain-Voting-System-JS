<template>
  <div class="audit-logs-section">
    <h3><PhShieldCheck :size="20" /> Admin Audit Logs</h3>

    <div class="logs-filters">
      <div class="filter-group">
        <label for="logFilter">Filter by Action:</label>
        <select v-model="selectedAction" id="logFilter" class="form-input">
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
        <select v-model="selectedStatus" id="statusFilter" class="form-input">
          <option value="">All</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <button @click="fetchLogs" class="btn btn-primary btn-small">
        Refresh
      </button>
    </div>

    <div v-if="loading" class="loading">Loading audit logs...</div>
    <div v-else-if="fetchError" class="alert alert-danger">
      {{ fetchError }}
    </div>
    <div v-else-if="filteredLogs.length === 0" class="alert alert-info">
      No audit logs found
    </div>
    <div v-else class="logs-container">
      <div
        v-for="log in filteredLogs"
        :key="log.id"
        class="log-entry"
        :class="`status-${log.status}`"
      >
        <div class="log-header">
          <span class="log-timestamp">{{ formatDate(log.timestamp) }}</span>
          <span class="log-action">{{ log.action_type }}</span>
          <span
            class="log-status"
            :class="{
              success: log.status === 'success',
              failed: log.status === 'failed',
            }"
          >
            {{ log.status.toUpperCase() }}
          </span>
        </div>

        <div class="log-details">
          <div class="detail-row">
            <span class="label">Resource:</span>
            <span class="value"
              >{{ log.resource_type }} #{{ log.resource_id }}</span
            >
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
            <span class="value monospace"
              >{{ log.change_hash?.substring(0, 16) }}...</span
            >
            <button
              @click="verifyIntegrity(log.id)"
              class="btn btn-small btn-secondary"
            >
              Verify
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="pagination">
      <button
        @click="previousPage"
        class="btn btn-secondary btn-small"
        :disabled="offset === 0"
      >
        Previous
      </button>
      <span>Page {{ currentPage }} of {{ totalPages }}</span>
      <button
        @click="nextPage"
        class="btn btn-secondary btn-small"
        :disabled="offset + limit >= total"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script>
import api from "../services/api";
import { PhShieldCheck } from "@phosphor-icons/vue";

export default {
  name: "AdminAuditLogs",
  components: { PhShieldCheck },
  props: {
    tabActive: { type: Boolean, default: false },
  },
  watch: {
    tabActive(active) {
      if (active) this.fetchLogs();
    },
  },
  data() {
    return {
      logs: [],
      selectedAction: "",
      selectedStatus: "",
      loading: false,
      fetchError: null,
      limit: 20,
      offset: 0,
      total: 0,
    };
  },
  computed: {
    currentPage() {
      return Math.floor(this.offset / this.limit) + 1;
    },
    totalPages() {
      return Math.ceil(this.total / this.limit);
    },
    filteredLogs() {
      return this.logs.filter((log) => {
        const actionMatch =
          !this.selectedAction || log.action_type === this.selectedAction;
        const statusMatch =
          !this.selectedStatus || log.status === this.selectedStatus;
        return actionMatch && statusMatch;
      });
    },
  },
  methods: {
    async fetchLogs() {
      this.loading = true;
      this.fetchError = null;
      try {
        const { data } = await api.get(
          `/elections/admin/audit-logs?limit=${this.limit}&offset=${this.offset}`,
        );
        this.logs = data.logs;
        this.total = data.total;
      } catch (err) {
        this.fetchError =
          err.displayMessage ||
          err.response?.data?.message ||
          "Failed to load audit logs. Please try again.";
        console.error("Error fetching logs:", err);
      } finally {
        this.loading = false;
      }
    },
    async verifyIntegrity(logId) {
      try {
        const { data: result } = await api.post(
          `/elections/admin/verify-audit-integrity/${logId}`,
        );

        if (result.valid) {
          alert(`✓ Audit log #${logId} integrity verified - Hash matches`);
        } else {
          alert(
            `✗ Audit log #${logId} integrity check failed - ${result.reason}`,
          );
        }
      } catch (err) {
        const msg =
          err.displayMessage || err.response?.data?.message || err.message;
        alert("Error verifying integrity: " + msg);
      }
    },
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    },
    formatJson(jsonString) {
      try {
        return JSON.stringify(JSON.parse(jsonString), null, 2);
      } catch {
        return jsonString;
      }
    },
    nextPage() {
      this.offset += this.limit;
      this.fetchLogs();
    },
    previousPage() {
      if (this.offset >= this.limit) {
        this.offset -= this.limit;
        this.fetchLogs();
      }
    },
  },
  mounted() {
    this.fetchLogs();
  },
};
</script>

<style scoped>
.audit-logs-section {
  margin-top: 40px;
}

.audit-logs-section h3 {
  margin-top: 0;
  color: var(--text-primary);
  border-bottom: 2px solid var(--accent);
  padding-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
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
  color: var(--text-primary);
}

.filter-group .form-input {
  min-width: 180px;
}

.filter-group select.form-input {
  appearance: none;
  padding: 10px 36px 10px 12px;
  background-color: var(--bg-card);
  background-image:
    linear-gradient(45deg, transparent 50%, var(--text-muted) 50%),
    linear-gradient(135deg, var(--text-muted) 50%, transparent 50%);
  background-position:
    calc(100% - 16px) calc(50% + 1px),
    calc(100% - 10px) calc(50% + 1px);
  background-size:
    6px 6px,
    6px 6px;
  background-repeat: no-repeat;
}

.filter-group select.form-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent);
}

.logs-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.log-entry {
  background: var(--bg-card);
  border-left: 4px solid var(--accent);
  padding: 15px;
  border-radius: 6px;
  box-shadow: var(--shadow);
}

.log-entry.status-failed {
  border-left-color: var(--error);
  background-color: color-mix(in srgb, var(--error) 5%, transparent);
}

.log-entry.status-success {
  border-left-color: var(--success);
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
  color: var(--text-muted);
}

.log-action {
  font-weight: 600;
  color: var(--text-primary);
  background-color: var(--bg-secondary);
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
  background-color: color-mix(in srgb, var(--success) 15%, transparent);
  color: var(--success);
}

.log-status.failed {
  background-color: color-mix(in srgb, var(--error) 15%, transparent);
  color: var(--error);
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
  color: var(--text-secondary);
  min-width: 100px;
}

.detail-row .value {
  color: var(--text-primary);
  flex: 1;
}

.detail-row .value.error {
  color: var(--error);
}

.detail-row .value.monospace {
  font-family: "Courier New", monospace;
  background-color: var(--bg-secondary);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9rem;
}

.detail-row .value.changes {
  background-color: var(--bg-secondary);
  padding: 10px;
  border-radius: 4px;
  font-size: 0.85rem;
  max-height: 200px;
  overflow-y: auto;
}

.loading {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}

.pagination {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 20px;
  align-items: center;
}

.alert {
  padding: 15px;
  border-radius: 6px;
  background-color: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--accent);
  border: 1px solid var(--border);
  border-left: 4px solid;
}

.alert-danger {
  background-color: color-mix(in srgb, var(--error) 10%, transparent);
  color: var(--error);
  border-left-color: var(--error);
}
</style>
