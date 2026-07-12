<template>
  <div class="voter-picker-page">
    <!-- Header -->
    <div class="vp-header">
      <div class="vp-header-inner">
        <h1>🎓 Institute Members</h1>
      </div>

    </div>

    <!-- Stats -->
    <div class="vp-stats" v-if="stats">
      <div class="stat blue">
        <div class="stat-n">{{ stats.total }}</div>
        <div class="stat-l">Total members</div>
      </div>
      <div class="stat green">
        <div class="stat-n">{{ stats.available }}</div>
        <div class="stat-l">Available</div>
      </div>
      <div class="stat red">
        <div class="stat-n">{{ stats.voters }}</div>
        <div class="stat-l">Registered voters</div>
      </div>
    </div>

    <!-- Controls -->
    <div class="vp-controls">
      <input
        v-model="searchQuery"
        @input="onSearch"
        type="search"
        placeholder="Search name or ID…"
        class="vp-search"
      />
      <div class="vp-filters">
        <button
          v-for="r in roles"
          :key="r.value"
          :class="['btn-filter', { active: selectedRole === r.value }]"
          @click="setRole(r.value)"
        >{{ r.label }}</button>
        <button
          :class="['btn-filter', { active: availableOnly }]"
          @click="toggleAvailable"
        >Available only</button>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="vp-error">⚠ {{ error }}</div>

    <!-- Table -->
    <div class="vp-table-wrap">
      <table class="vp-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Institution ID</th>
            <th>Full Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Department</th>
            <th>Year</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="td-center">Loading…</td>
          </tr>
          <tr v-else-if="members.length === 0">
            <td colspan="7" class="td-center">No results found</td>
          </tr>
          <template v-else>
            <tr
              v-for="m in members"
              :key="m.institution_id"
              :class="m.is_voter ? 'row-taken' : 'row-available'"
            >
              <td>
                <span :class="['vp-badge', m.is_voter ? 'taken' : 'avail']">
                  {{ m.is_voter ? '✗ Registered' : '✓ Available' }}
                </span>
              </td>
              <td>
                <code>{{ m.institution_id }}</code>
                <button class="copy-btn" @click="copy(m.institution_id)" title="Copy ID">copy</button>
              </td>
              <td>{{ m.full_name }}</td>
              <td class="muted">{{ m.email }}</td>
              <td><span :class="['role-badge', m.role]">{{ m.role }}</span></td>
              <td class="muted">{{ m.department || '' }}</td>
              <td class="muted">{{ m.year_level || '—' }}</td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="vp-pagination" v-if="!isSearchMode">
      <button class="pager" :disabled="pagination.page <= 1" @click="goToPage(1)">⇤ First</button>
      <button class="pager" :disabled="pagination.page <= 1" @click="changePage(-1)">← Prev</button>
      <span class="page-info">Page {{ pagination.page }} of {{ pagination.pages }} ({{ pagination.total }} rows)</span>
      <button class="pager" :disabled="pagination.page >= pagination.pages" @click="changePage(1)">Next →</button>
      <button class="pager" :disabled="pagination.page >= pagination.pages" @click="goToPage(pagination.pages)">Last ⇥</button>
    </div>
    <div class="vp-pagination" v-else>
      <span class="page-info">{{ members.length }} result(s)</span>
    </div>

    <!-- Toast -->
    <div :class="['vp-toast', { show: toast }]">{{ toastMsg }}</div>
  </div>
</template>

<script>
const INSTITUTION_API = 'http://localhost:4000'
const LIMIT = 20

export default {
  name: 'InstituteMembersView',
  data() {
    return {
      members: [],
      stats: null,
      pagination: { page: 1, pages: 1, total: 0 },
      loading: false,
      error: null,
      searchQuery: '',
      selectedRole: '',
      availableOnly: false,
      page: 1,
      debounceTimer: null,
      toast: false,
      toastMsg: '',
      autoRefresh: null,
      roles: [
        { value: '', label: 'All' },
        { value: 'student', label: 'Students' },
        { value: 'teacher', label: 'Teachers' },
        { value: 'staff', label: 'Staff' },
      ],
    }
  },
  computed: {
    isSearchMode() {
      return this.searchQuery.length >= 2
    },
  },
  mounted() {
    this.load()
    this.autoRefresh = setInterval(() => this.load(), 10000)
  },
  beforeUnmount() {
    clearInterval(this.autoRefresh)
  },
  methods: {
    async load() {
      this.loading = true
      this.error = null
      try {
        let url
        if (this.isSearchMode) {
          url = `${INSTITUTION_API}/api/search?q=${encodeURIComponent(this.searchQuery)}`
        } else {
          const params = new URLSearchParams({ page: this.page, limit: LIMIT })
          if (this.selectedRole) params.set('role', this.selectedRole)
          if (this.availableOnly) params.set('voter', 'false')
          url = `${INSTITUTION_API}/api/members?${params}`
        }
        const res = await fetch(url)
        const data = await res.json()
        this.members = this.isSearchMode ? (data.results || []) : (data.members || [])
        if (data.stats) this.stats = data.stats
        if (data.pagination) this.pagination = data.pagination
      } catch (e) {
        this.error = 'Failed to load: ' + e.message
      } finally {
        this.loading = false
      }
    },
    onSearch() {
      clearTimeout(this.debounceTimer)
      this.page = 1
      this.debounceTimer = setTimeout(() => this.load(), 300)
    },
    setRole(role) {
      this.selectedRole = role
      this.page = 1
      this.load()
    },
    toggleAvailable() {
      this.availableOnly = !this.availableOnly
      this.page = 1
      this.load()
    },
    changePage(dir) {
      this.page = Math.max(1, Math.min(this.pagination.pages, this.page + dir))
      this.load()
    },
    goToPage(n) {
      this.page = Math.max(1, Math.min(this.pagination.pages, n))
      this.load()
    },
    copy(text) {
      navigator.clipboard.writeText(text).then(() => this.showToast('Copied: ' + text))
    },
    showToast(msg) {
      this.toastMsg = msg
      this.toast = true
      setTimeout(() => { this.toast = false }, 2000)
    },
  },
}
</script>

<style scoped>
.voter-picker-page {
  background: #f5f5f5;
  color: #2c3e50;
  padding-bottom: 40px;
  min-height: calc(100vh - 60px);
}

.vp-header {
  background: #fff;
  padding: 18px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.vp-header-inner {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.vp-header-inner h1 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #2c3e50;
}

/* Stats */
.vp-stats {
  display: flex;
  gap: 12px;
  margin: 20px 24px 0;
  flex-wrap: wrap;
}

.stat {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px 20px;
  min-width: 130px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.06);
}

.stat-n {
  font-size: 1.8rem;
  font-weight: 700;
  line-height: 1;
}

.stat-l {
  font-size: 0.75rem;
  color: #6c757d;
  margin-top: 4px;
}

.stat.blue .stat-n { color: #3498db; }
.stat.green .stat-n { color: #27ae60; }
.stat.red .stat-n { color: #e74c3c; }

/* Controls */
.vp-controls {
  display: flex;
  gap: 10px;
  margin: 16px 24px;
  flex-wrap: wrap;
  align-items: center;
}

.vp-search {
  background: #fff;
  border: 1px solid #ced4da;
  border-radius: 8px;
  padding: 8px 14px;
  color: #2c3e50;
  font-size: 0.9rem;
  width: 260px;
  outline: none;
}

.vp-search::placeholder { color: #adb5bd; }
.vp-search:focus { border-color: #3498db; box-shadow: 0 0 0 2px rgba(52,152,219,0.15); }

.vp-filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.btn-filter {
  border: 1px solid #ced4da;
  background: #fff;
  color: #6c757d;
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
}

.btn-filter:hover {
  border-color: #3498db;
  color: #3498db;
}

.btn-filter.active {
  background: #3498db;
  border-color: #3498db;
  color: #fff;
  font-weight: 600;
}

/* Error */
.vp-error {
  margin: 0 24px 12px;
  color: #e74c3c;
  font-size: 0.9rem;
}

/* Table */
.vp-table-wrap {
  margin: 0 24px;
  overflow-x: auto;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.06);
}

.vp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.vp-table thead tr {
  background: #f8f9fa;
  border-bottom: 2px solid #e2e8f0;
}

.vp-table th {
  padding: 10px 14px;
  text-align: left;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6c757d;
  white-space: nowrap;
}

.vp-table td {
  padding: 10px 14px;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
  color: #2c3e50;
}

.vp-table tr:last-child td { border-bottom: none; }

.row-available:hover { background: #f8f9fa; }
.row-taken { opacity: 0.5; }
.row-taken:hover { background: #fff5f5; }

.td-center {
  text-align: center;
  padding: 40px !important;
  color: #adb5bd;
}

.vp-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.vp-badge.avail { background: #d4edda; color: #155724; }
.vp-badge.taken { background: #f8d7da; color: #721c24; }

.role-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
}

.role-badge.student { background: #cce5ff; color: #004085; }
.role-badge.teacher { background: #e2d9f3; color: #4a235a; }
.role-badge.staff   { background: #d4edda; color: #155724; }

.muted { color: #6c757d; }

.copy-btn {
  background: none;
  border: 1px solid #ced4da;
  border-radius: 4px;
  color: #6c757d;
  padding: 2px 7px;
  font-size: 0.75rem;
  cursor: pointer;
  margin-left: 4px;
}

.copy-btn:hover { border-color: #3498db; color: #3498db; }

/* Pagination */
.vp-pagination {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  margin: 16px 24px;
  flex-wrap: wrap;
}

.pager {
  background: #fff;
  border: 1px solid #ced4da;
  border-radius: 8px;
  padding: 6px 14px;
  cursor: pointer;
  color: #2c3e50;
  font-size: 0.85rem;
}

.pager:disabled { opacity: 0.4; cursor: default; }
.pager:not(:disabled):hover { border-color: #3498db; color: #3498db; }

.page-info { color: #6c757d; font-size: 0.85rem; }

/* Toast */
.vp-toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #fff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
  color: #2c3e50;
  z-index: 1000;
}

.vp-toast.show { opacity: 1; }
</style>
