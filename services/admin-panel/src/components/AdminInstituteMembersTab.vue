<template>
  <div class="members-tab">

    <!-- Stats bar -->
    <div class="members-stats" v-if="stats">
      <div class="stat-pill blue">Total: <strong>{{ stats.total }}</strong></div>
      <div class="stat-pill green">Available: <strong>{{ stats.available }}</strong></div>
      <div class="stat-pill orange">Registered voters: <strong>{{ stats.voters }}</strong></div>
    </div>

    <!-- Toolbar -->
    <div class="members-toolbar">
      <input
        v-model="search"
        @input="onSearch"
        type="search"
        class="form-control toolbar-search"
        placeholder="Search name or ID…"
      />
      <div class="toolbar-filters">
        <button
          v-for="r in roleOptions"
          :key="r.value"
          :class="['btn btn-small', selectedRole === r.value ? 'btn-primary' : 'btn-secondary']"
          @click="setRole(r.value)"
        >{{ r.label }}</button>
        <button
          :class="['btn btn-small', voterFilter === 'false' ? 'btn-primary' : 'btn-secondary']"
          @click="toggleAvailable"
        >Available only</button>
      </div>
      <button class="btn btn-primary btn-small toolbar-add" @click="openAdd">
        + Add Member
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="successMsg" class="alert alert-success">{{ successMsg }}</div>

    <!-- Table -->
    <div class="members-table-wrap">
      <div v-if="loading" class="loading-row">Loading…</div>
      <table v-else class="members-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Institution ID</th>
            <th>Full Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Department</th>
            <th>Year</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="members.length === 0">
            <td colspan="8" class="empty-row">No results found.</td>
          </tr>
          <tr v-for="m in members" :key="m.institution_id" :class="m.is_voter ? 'row-voter' : ''">
            <td>
              <span :class="['status-badge', m.is_voter ? 'status-registered' : 'status-pending']">
                {{ m.is_voter ? 'Registered' : 'Available' }}
              </span>
            </td>
            <td><code>{{ m.institution_id }}</code></td>
            <td>{{ m.full_name }}</td>
            <td class="muted">{{ m.email }}</td>
            <td>
              <span :class="['role-badge', 'role-' + m.role]">{{ m.role }}</span>
            </td>
            <td class="muted">{{ m.department }}</td>
            <td class="muted">{{ m.year_level || '—' }}</td>
            <td class="actions-cell">
              <button class="btn btn-small btn-primary" @click="openEdit(m)">Edit</button>
              <button
                class="btn btn-small btn-danger"
                @click="deleteMember(m)"
                :disabled="!!m.is_voter"
                :title="m.is_voter ? 'Cannot delete a registered voter' : 'Delete member'"
              >Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="members-pagination" v-if="!isSearchMode">
      <button class="btn btn-small btn-secondary" :disabled="page <= 1" @click="goToPage(1)">⇤ First</button>
      <button class="btn btn-small btn-secondary" :disabled="page <= 1" @click="page--; load()">← Prev</button>
      <span class="page-info">Page {{ pagination.page }} of {{ pagination.pages }} ({{ pagination.total }})</span>
      <button class="btn btn-small btn-secondary" :disabled="page >= pagination.pages" @click="page++; load()">Next →</button>
      <button class="btn btn-small btn-secondary" :disabled="page >= pagination.pages" @click="goToPage(pagination.pages)">Last ⇥</button>
    </div>

    <!-- Add / Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-box">
        <h3>{{ isEditing ? 'Edit Member' : 'Add Member' }}</h3>

        <div v-if="modalError" class="alert alert-danger">{{ modalError }}</div>

        <div class="form-group" v-if="!isEditing">
          <label>Institution ID *</label>
          <input v-model="form.institution_id" class="form-control" placeholder="e.g. STU00501" />
        </div>
        <div class="form-group" v-else>
          <label>Institution ID</label>
          <input :value="form.institution_id" class="form-control" disabled />
        </div>

        <div class="form-group">
          <label>Full Name *</label>
          <input v-model="form.full_name" class="form-control" placeholder="e.g. John Smith" />
        </div>

        <div class="form-group">
          <label>Email *</label>
          <input v-model="form.email" type="email" class="form-control" placeholder="e.g. john@university.edu" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Role *</label>
            <select v-model="form.role" class="form-control">
              <option value="">— Select —</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <div class="form-group">
            <label>Year Level</label>
            <select v-model="form.year_level" class="form-control">
              <option value="">— N/A —</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Department *</label>
          <input v-model="form.department" class="form-control" placeholder="e.g. Computer Science" />
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeModal">Cancel</button>
          <button class="btn btn-primary" @click="saveMember" :disabled="saving">
            {{ saving ? 'Saving…' : (isEditing ? 'Update' : 'Create') }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
const API = 'http://localhost:4000'
const LIMIT = 20

const emptyForm = () => ({ institution_id: '', full_name: '', email: '', role: '', department: '', year_level: '' })

export default {
  name: 'AdminInstituteMembersTab',
  data() {
    return {
      members: [],
      stats: null,
      pagination: { page: 1, pages: 1, total: 0 },
      page: 1,
      search: '',
      selectedRole: '',
      voterFilter: null,
      loading: false,
      error: null,
      successMsg: null,
      debounceTimer: null,
      showModal: false,
      isEditing: false,
      form: emptyForm(),
      modalError: null,
      saving: false,
      roleOptions: [
        { value: '', label: 'All' },
        { value: 'student', label: 'Students' },
        { value: 'teacher', label: 'Teachers' },
        { value: 'staff', label: 'Staff' },
      ],
    }
  },
  computed: {
    isSearchMode() {
      return this.search.length >= 2
    },
  },
  mounted() {
    this.load()
  },
  methods: {
    async load() {
      this.loading = true
      this.error = null
      try {
        let url
        if (this.isSearchMode) {
          url = `${API}/api/search?q=${encodeURIComponent(this.search)}`
        } else {
          const p = new URLSearchParams({ page: this.page, limit: LIMIT })
          if (this.selectedRole) p.set('role', this.selectedRole)
          if (this.voterFilter) p.set('voter', this.voterFilter)
          url = `${API}/api/members?${p}`
        }
        const res = await fetch(url)
        const data = await res.json()
        this.members = this.isSearchMode ? (data.results || []) : (data.members || [])
        if (data.stats) this.stats = data.stats
        if (data.pagination) this.pagination = data.pagination
      } catch (e) {
        this.error = 'Failed to load members: ' + e.message
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
      this.voterFilter = this.voterFilter === 'false' ? null : 'false'
      this.page = 1
      this.load()
    },
    goToPage(n) {
      this.page = Math.max(1, Math.min(this.pagination.pages, n))
      this.load()
    },
    openAdd() {
      this.isEditing = false
      this.form = emptyForm()
      this.modalError = null
      this.showModal = true
    },
    openEdit(member) {
      this.isEditing = true
      this.form = {
        institution_id: member.institution_id,
        full_name: member.full_name,
        email: member.email,
        role: member.role,
        department: member.department,
        year_level: member.year_level || '',
      }
      this.modalError = null
      this.showModal = true
    },
    closeModal() {
      this.showModal = false
      this.modalError = null
    },
    async saveMember() {
      this.modalError = null
      if (!this.form.full_name || !this.form.email || !this.form.role || !this.form.department) {
        this.modalError = 'Full Name, Email, Role and Department are required.'
        return
      }
      if (!this.isEditing && !this.form.institution_id) {
        this.modalError = 'Institution ID is required.'
        return
      }
      this.saving = true
      try {
        const url = this.isEditing
          ? `${API}/api/members/${this.form.institution_id}`
          : `${API}/api/members`
        const method = this.isEditing ? 'PUT' : 'POST'
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.form),
        })
        const data = await res.json()
        if (!res.ok) { this.modalError = data.message || 'Save failed.'; return }
        this.showSuccess(this.isEditing ? 'Member updated successfully.' : 'Member created successfully.')
        this.closeModal()
        this.page = 1
        await this.load()
      } catch (e) {
        this.modalError = e.message
      } finally {
        this.saving = false
      }
    },
    async deleteMember(member) {
      if (!confirm(`Delete ${member.full_name} (${member.institution_id})?`)) return
      this.error = null
      try {
        const res = await fetch(`${API}/api/members/${member.institution_id}`, { method: 'DELETE' })
        const data = await res.json()
        if (!res.ok) { this.error = data.message; return }
        this.showSuccess('Member deleted.')
        await this.load()
      } catch (e) {
        this.error = e.message
      }
    },
    showSuccess(msg) {
      this.successMsg = msg
      setTimeout(() => { this.successMsg = null }, 3000)
    },
  },
}
</script>

<style scoped>
.members-tab { padding: 0; }

/* Stats */
.members-stats {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.stat-pill {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  border: 1px solid transparent;
}
.stat-pill.blue  { background: #e8f4fd; border-color: #bee3f8; color: #2b6cb0; }
.stat-pill.green { background: #f0fff4; border-color: #9ae6b4; color: #276749; }
.stat-pill.orange{ background: #fffaf0; border-color: #fbd38d; color: #c05621; }

/* Toolbar */
.members-toolbar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 16px;
}
.toolbar-search { width: 240px; }
.toolbar-filters { display: flex; gap: 6px; flex-wrap: wrap; }
.toolbar-add { margin-left: auto; }

/* Table */
.members-table-wrap {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  margin-bottom: 16px;
}
.loading-row {
  padding: 40px;
  text-align: center;
  color: #a0aec0;
}
.members-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.members-table thead tr { background: #f7fafc; }
.members-table th {
  padding: 10px 14px;
  text-align: left;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #718096;
  white-space: nowrap;
  border-bottom: 2px solid #e2e8f0;
}
.members-table td {
  padding: 10px 14px;
  border-bottom: 1px solid #f0f4f8;
  color: #2d3748;
  white-space: nowrap;
}
.members-table tr:last-child td { border-bottom: none; }
.row-voter td { opacity: 0.6; }
.empty-row { text-align: center; padding: 40px !important; color: #a0aec0; }

/* Status badge */
.status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}
.status-registered { background: #fed7d7; color: #822727; }
.status-pending    { background: #c6f6d5; color: #22543d; }

/* Role badge */
.role-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}
.role-student { background: #ebf8ff; color: #2b6cb0; }
.role-teacher { background: #faf5ff; color: #6b46c1; }
.role-staff   { background: #f0fff4; color: #276749; }

.muted { color: #718096; }
.actions-cell { display: flex; gap: 6px; }

/* Pagination */
.members-pagination {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 4px;
}
.page-info { font-size: 0.85rem; color: #718096; }

/* Forms */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.form-group { margin-bottom: 14px; }
.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 6px;
}
.form-control {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 0.9rem;
  color: #2d3748;
  background: #fff;
  box-sizing: border-box;
  outline: none;
}
.form-control:focus { border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.15); }
.form-control:disabled { background: #f7fafc; cursor: not-allowed; }

/* Buttons */
.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.875rem;
  transition: opacity 0.15s;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary   { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; }
.btn-secondary { background: #edf2f7; color: #4a5568; }
.btn-danger    { background: #e53e3e; color: #fff; }
.btn-small     { padding: 5px 12px; font-size: 0.8rem; }

/* Alerts */
.alert {
  padding: 10px 14px;
  border-radius: 6px;
  margin-bottom: 14px;
  font-size: 0.875rem;
}
.alert-danger  { background: #fff5f5; border: 1px solid #fed7d7; color: #c53030; }
.alert-success { background: #f0fff4; border: 1px solid #9ae6b4; color: #276749; }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-box {
  background: #fff;
  border-radius: 12px;
  padding: 28px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.2);
}
.modal-box h3 { margin-bottom: 20px; color: #2d3748; font-size: 1.15rem; }
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}
</style>
