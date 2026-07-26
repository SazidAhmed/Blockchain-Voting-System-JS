<template>
  <div class="members-tab">
    <!-- Stats bar -->
    <div class="members-stats" v-if="stats">
      <div class="stat-pill blue">
        Total: <strong>{{ stats.total }}</strong>
      </div>
      <div class="stat-pill green">
        Available: <strong>{{ stats.available }}</strong>
      </div>
      <div class="stat-pill orange">
        Registered voters: <strong>{{ stats.voters }}</strong>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="members-toolbar">
      <input
        v-model="search"
        @input="onSearch"
        type="search"
        class="form-input toolbar-search"
        placeholder="Search name or ID…"
      />
      <div class="toolbar-filters">
        <button
          v-for="r in roleOptions"
          :key="r.value"
          :class="[
            'btn btn-small',
            selectedRole === r.value ? 'btn-primary' : 'btn-secondary',
          ]"
          @click="setRole(r.value)"
        >
          {{ r.label }}
        </button>
        <button
          :class="[
            'btn btn-small',
            voterFilter === 'false' ? 'btn-primary' : 'btn-secondary',
          ]"
          @click="toggleAvailable"
        >
          Available only
        </button>
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
          <tr
            v-for="m in members"
            :key="m.institution_id"
            :class="m.is_voter ? 'row-voter' : ''"
          >
            <td>
              <span
                :class="[
                  'status-badge',
                  m.is_voter ? 'status-registered' : 'status-pending',
                ]"
              >
                {{ m.is_voter ? "Registered" : "Available" }}
              </span>
            </td>
            <td>
              <code>{{ m.institution_id }}</code>
            </td>
            <td>{{ m.full_name }}</td>
            <td class="muted">{{ m.email }}</td>
            <td>
              <span :class="['role-badge', 'role-' + m.role]">{{
                m.role
              }}</span>
            </td>
            <td class="muted">{{ m.department }}</td>
            <td class="muted">{{ m.year_level || "—" }}</td>
            <td class="actions-cell">
              <button class="btn btn-small btn-primary" @click="openEdit(m)">
                Edit
              </button>
              <button
                class="btn btn-small btn-danger"
                @click="deleteMember(m)"
                :disabled="!!m.is_voter"
                :title="
                  m.is_voter
                    ? 'Cannot delete a registered voter'
                    : 'Delete member'
                "
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="members-pagination" v-if="!isSearchMode">
      <button
        class="btn btn-small btn-secondary"
        :disabled="page <= 1"
        @click="goToPage(1)"
      >
        ⇤ First
      </button>
      <button
        class="btn btn-small btn-secondary"
        :disabled="page <= 1"
        @click="
          page--;
          load();
        "
      >
        ← Prev
      </button>
      <span class="page-info"
        >Page {{ pagination.page }} of {{ pagination.pages }} ({{
          pagination.total
        }})</span
      >
      <button
        class="btn btn-small btn-secondary"
        :disabled="page >= pagination.pages"
        @click="
          page++;
          load();
        "
      >
        Next →
      </button>
      <button
        class="btn btn-small btn-secondary"
        :disabled="page >= pagination.pages"
        @click="goToPage(pagination.pages)"
      >
        Last ⇥
      </button>
    </div>

    <!-- Add / Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-box">
        <h3>{{ isEditing ? "Edit Member" : "Add Member" }}</h3>

        <div v-if="modalError" class="alert alert-danger">{{ modalError }}</div>

        <div class="form-group" v-if="!isEditing">
          <label>Institution ID *</label>
          <input
            v-model="form.institution_id"
            class="form-input"
            placeholder="e.g. STU00501"
          />
        </div>
        <div class="form-group" v-else>
          <label>Institution ID</label>
          <input :value="form.institution_id" class="form-input" disabled />
        </div>

        <div class="form-group">
          <label>Full Name *</label>
          <input
            v-model="form.full_name"
            class="form-input"
            placeholder="e.g. John Smith"
          />
        </div>

        <div class="form-group">
          <label>Email *</label>
          <input
            v-model="form.email"
            type="email"
            class="form-input"
            placeholder="e.g. john@university.edu"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Role *</label>
            <select v-model="form.role" class="form-input">
              <option value="">— Select —</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <div class="form-group">
            <label>Year Level</label>
            <select v-model="form.year_level" class="form-input">
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
          <input
            v-model="form.department"
            class="form-input"
            placeholder="e.g. Computer Science"
          />
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeModal">Cancel</button>
          <button
            class="btn btn-primary"
            @click="saveMember"
            :disabled="saving"
          >
            {{ saving ? "Saving…" : isEditing ? "Update" : "Create" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const API = import.meta.env.VITE_INSTITUTION_API_URL || "http://localhost:4000";
const LIMIT = 20;

const emptyForm = () => ({
  institution_id: "",
  full_name: "",
  email: "",
  role: "",
  department: "",
  year_level: "",
});

export default {
  name: "AdminInstituteMembersTab",
  data() {
    return {
      members: [],
      stats: null,
      pagination: { page: 1, pages: 1, total: 0 },
      page: 1,
      search: "",
      selectedRole: "",
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
        { value: "", label: "All" },
        { value: "student", label: "Students" },
        { value: "teacher", label: "Teachers" },
        { value: "staff", label: "Staff" },
      ],
    };
  },
  computed: {
    isSearchMode() {
      return this.search.length >= 2;
    },
  },
  mounted() {
    this.load();
  },
  methods: {
    async load() {
      this.loading = true;
      this.error = null;
      try {
        let url;
        if (this.isSearchMode) {
          url = `${API}/api/search?q=${encodeURIComponent(this.search)}`;
        } else {
          const p = new URLSearchParams({ page: this.page, limit: LIMIT });
          if (this.selectedRole) p.set("role", this.selectedRole);
          if (this.voterFilter) p.set("voter", this.voterFilter);
          url = `${API}/api/members?${p}`;
        }
        const res = await fetch(url);
        const data = await res.json();
        this.members = this.isSearchMode
          ? data.results || []
          : data.members || [];
        if (data.stats) this.stats = data.stats;
        if (data.pagination) this.pagination = data.pagination;
      } catch (e) {
        this.error = "Failed to load members: " + e.message;
      } finally {
        this.loading = false;
      }
    },
    onSearch() {
      clearTimeout(this.debounceTimer);
      this.page = 1;
      this.debounceTimer = setTimeout(() => this.load(), 300);
    },
    setRole(role) {
      this.selectedRole = role;
      this.page = 1;
      this.load();
    },
    toggleAvailable() {
      this.voterFilter = this.voterFilter === "false" ? null : "false";
      this.page = 1;
      this.load();
    },
    goToPage(n) {
      this.page = Math.max(1, Math.min(this.pagination.pages, n));
      this.load();
    },
    openAdd() {
      this.isEditing = false;
      this.form = emptyForm();
      this.modalError = null;
      this.showModal = true;
    },
    openEdit(member) {
      this.isEditing = true;
      this.form = {
        institution_id: member.institution_id,
        full_name: member.full_name,
        email: member.email,
        role: member.role,
        department: member.department,
        year_level: member.year_level || "",
      };
      this.modalError = null;
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
      this.modalError = null;
    },
    async saveMember() {
      this.modalError = null;
      if (
        !this.form.full_name ||
        !this.form.email ||
        !this.form.role ||
        !this.form.department
      ) {
        this.modalError = "Full Name, Email, Role and Department are required.";
        return;
      }
      if (!this.isEditing && !this.form.institution_id) {
        this.modalError = "Institution ID is required.";
        return;
      }
      this.saving = true;
      try {
        const url = this.isEditing
          ? `${API}/api/members/${this.form.institution_id}`
          : `${API}/api/members`;
        const method = this.isEditing ? "PUT" : "POST";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.form),
        });
        const data = await res.json();
        if (!res.ok) {
          this.modalError = data.message || "Save failed.";
          return;
        }
        this.showSuccess(
          this.isEditing
            ? "Member updated successfully."
            : "Member created successfully.",
        );
        this.closeModal();
        this.page = 1;
        await this.load();
      } catch (e) {
        this.modalError = e.message;
      } finally {
        this.saving = false;
      }
    },
    async deleteMember(member) {
      if (!confirm(`Delete ${member.full_name} (${member.institution_id})?`))
        return;
      this.error = null;
      try {
        const res = await fetch(`${API}/api/members/${member.institution_id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok) {
          this.error = data.message;
          return;
        }
        this.showSuccess("Member deleted.");
        await this.load();
      } catch (e) {
        this.error = e.message;
      }
    },
    showSuccess(msg) {
      this.successMsg = msg;
      setTimeout(() => {
        this.successMsg = null;
      }, 3000);
    },
  },
};
</script>

<style scoped>
.members-tab {
  padding: 0;
}

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
.stat-pill.blue {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border-color: var(--border);
  color: var(--accent);
}
.stat-pill.green {
  background: color-mix(in srgb, var(--success) 10%, transparent);
  border-color: var(--border);
  color: var(--success);
}
.stat-pill.orange {
  background: color-mix(in srgb, var(--warning) 10%, transparent);
  border-color: var(--border);
  color: var(--warning);
}

/* Toolbar */
.members-toolbar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 16px;
}
.toolbar-search {
  width: 240px;
}
.toolbar-filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.toolbar-add {
  margin-left: auto;
}

.members-tab select.form-input {
  appearance: none;
  padding-right: 36px;
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

.members-tab select.form-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent);
}

/* Table */
.members-table-wrap {
  overflow-x: auto;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  margin-bottom: 16px;
}
.loading-row {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}
.members-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.members-table thead tr {
  background: var(--bg-secondary);
}
.members-table th {
  padding: 10px 14px;
  text-align: left;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  white-space: nowrap;
  border-bottom: 2px solid var(--border);
}
.members-table td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  color: var(--text-primary);
  white-space: nowrap;
}
.members-table tr:last-child td {
  border-bottom: none;
}
.row-voter td {
  opacity: 0.6;
}
.empty-row {
  text-align: center;
  padding: 40px !important;
  color: var(--text-muted);
}

/* Status badge */
.status-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}
.status-registered {
  background: color-mix(in srgb, var(--error) 15%, transparent);
  color: var(--error);
}
.status-pending {
  background: color-mix(in srgb, var(--success) 15%, transparent);
  color: var(--success);
}

/* Role badge */
.role-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}
.role-student {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--accent);
}
.role-teacher {
  background: color-mix(in srgb, var(--accent-secondary) 10%, transparent);
  color: var(--accent-secondary);
}
.role-staff {
  background: color-mix(in srgb, var(--success) 10%, transparent);
  color: var(--success);
}

.muted {
  color: var(--text-muted);
}
.actions-cell {
  display: flex;
  gap: 6px;
}

/* Pagination */
.members-pagination {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 4px;
}
.page-info {
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* Forms */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* Alerts */
.alert {
  padding: 10px 14px;
  border-radius: 6px;
  margin-bottom: 14px;
  font-size: 0.875rem;
}
.alert-danger {
  background: color-mix(in srgb, var(--error) 10%, transparent);
  border: 1px solid var(--border);
  color: var(--error);
}
.alert-success {
  background: color-mix(in srgb, var(--success) 10%, transparent);
  border: 1px solid var(--border);
  color: var(--success);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-box {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 28px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}
.modal-box h3 {
  margin-bottom: 20px;
  color: var(--text-primary);
  font-size: 1.15rem;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}
</style>
