<template>
  <div class="admin-dashboard">
    <!-- Sidebar Navigation -->
    <aside class="admin-sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <span class="logo-icon">⚙️</span>
          <h2>Admin Panel</h2>
        </div>
        <button @click="logout" class="btn btn-danger btn-logout">
          <span>🚪 Logout</span>
        </button>
      </div>

      <nav class="sidebar-nav">
        <button
          v-for="tab in navigationTabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="['nav-item', { active: activeTab === tab.id }]"
        >
          <span class="nav-icon">{{ tab.icon }}</span>
          <span class="nav-label">{{ tab.label }}</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <p>Admin Dashboard</p>
        <small>© 2025 Voting System</small>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="admin-main">
      <header class="admin-header">
        <h1>{{ getCurrentTabLabel() }}</h1>
        <div class="header-info">
          <span class="admin-badge">🔐 Admin User</span>
        </div>
      </header>

      <div class="admin-content">
        <!-- Elections Tab -->
        <section v-show="activeTab === 'elections'" class="tab-content">
          <h2>Elections Management</h2>
          
          <div v-if="loading" class="loading">Loading elections...</div>
          <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
          <div v-else-if="elections.length === 0" class="alert alert-info">
            No elections found. Create one in the Create Election tab.
          </div>
          <div v-else class="elections-table">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Candidates</th>
                  <th>Votes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="election in elections" :key="election.id">
                  <td><strong>{{ election.title }}</strong></td>
                  <td>
                    <span class="status-badge" :class="`status-${election.status}`">
                      {{ election.status.toUpperCase() }}
                    </span>
                  </td>
                  <td>{{ formatDate(election.start_date) }}</td>
                  <td>{{ formatDate(election.end_date) }}</td>
                  <td class="text-center">{{ election.candidates_count || 0 }}</td>
                  <td class="text-center">{{ election.votes_count || 0 }}</td>
                  <td class="actions">
                    <button 
                      @click="editElection(election)" 
                      class="btn btn-small btn-primary"
                      :disabled="hasElectionStarted(election)"
                      :title="hasElectionStarted(election) ? 'Cannot edit after election starts' : 'Edit election'">
                      Edit
                    </button>
                    <button @click="toggleElectionStatus(election)" class="btn btn-small btn-warning">
                      {{ election.status === 'active' ? 'Deactivate' : 'Activate' }}
                    </button>
                    <button 
                      @click="deleteElection(election.id)" 
                      class="btn btn-small btn-danger"
                      :disabled="election.status === 'active' && hasElectionStarted(election)"
                      :title="(election.status === 'active' && hasElectionStarted(election)) ? 'Cannot delete active election after it starts' : 'Delete election'">
                      Delete
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Create Election Tab -->
        <section v-show="activeTab === 'create'" class="tab-content">
          <h2>Create New Election</h2>
          <form @submit.prevent="createElectionHandler" class="election-form">
            <div class="form-group">
              <label for="title">Election Title *</label>
              <input 
                v-model="newElection.title" 
                type="text" 
                id="title" 
                class="form-control"
                placeholder="e.g., Student Council President 2025"
                required
              >
            </div>

            <div class="form-group">
              <label for="description">Description</label>
              <textarea 
                v-model="newElection.description" 
                id="description" 
                class="form-control"
                rows="4"
                placeholder="Election description and details"
              ></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="startDate">Start Date *</label>
                <input 
                  v-model="newElection.startDate" 
                  type="datetime-local" 
                  id="startDate"
                  class="form-control"
                  required
                >
              </div>

              <div class="form-group">
                <label for="endDate">End Date *</label>
                <input 
                  v-model="newElection.endDate" 
                  type="datetime-local" 
                  id="endDate"
                  class="form-control"
                  required
                >
              </div>
            </div>

            <div class="form-group">
              <label>Candidates *</label>
              <div class="candidates-input">
                <div v-for="(candidate, index) in newElection.candidates" :key="index" class="candidate-input">
                  <input 
                    v-model="candidate.name" 
                    type="text" 
                    class="form-control"
                    placeholder="Candidate name"
                    required
                  >
                  <input 
                    v-model="candidate.description" 
                    type="text" 
                    class="form-control"
                    placeholder="Candidate description"
                  >
                  <button 
                    type="button"
                    @click="removeCandidate(index)" 
                    class="btn btn-danger btn-small"
                    v-if="newElection.candidates.length > 1"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <button 
                type="button"
                @click="addCandidate" 
                class="btn btn-secondary btn-small"
              >
                + Add Candidate
              </button>
            </div>

            <div v-if="createError" class="alert alert-danger">{{ createError }}</div>
            <div v-if="createSuccess" class="alert alert-success">{{ createSuccess }}</div>

            <div class="form-actions">
              <button type="submit" class="btn btn-primary" :disabled="creating">
                {{ creating ? (editingElectionId ? 'Updating...' : 'Creating...') : (editingElectionId ? 'Update Election' : 'Create Election') }}
              </button>
              <button type="button" @click="resetForm" class="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </section>

        <!-- Manage Candidates Tab -->
        <section v-show="activeTab === 'candidates'" class="tab-content">
          <h2>Manage Candidates</h2>
          
          <div v-if="elections.length === 0" class="alert alert-info">
            No elections available. Create an election first.
          </div>
          <div v-else>
            <div class="form-group">
              <label for="electionSelect">Select Election:</label>
              <select v-model="selectedElectionId" id="electionSelect" class="form-control">
                <option value="">-- Choose an election --</option>
                <option v-for="e in elections" :key="e.id" :value="e.id">
                  {{ e.title }}
                </option>
              </select>
            </div>

            <div v-if="selectedElectionId" class="candidates-management">
              <h3>Candidates for: {{ selectedElection?.title }}</h3>
              
              <div v-if="selectedElection?.candidates.length === 0" class="alert alert-info">
                No candidates for this election yet.
              </div>
              <div v-else class="candidates-list">
                <div v-for="candidate in selectedElection.candidates" :key="candidate.id" class="candidate-card">
                  <h4>{{ candidate.name }}</h4>
                  <p>{{ candidate.description }}</p>
                  <div class="candidate-stats">
                    <span>Votes: {{ candidate.votes_count || 0 }}</span>
                  </div>
                  <button @click="deleteCandidate(candidate.id)" class="btn btn-danger btn-small">
                    Delete
                  </button>
                </div>
              </div>

              <div class="add-candidate-form">
                <h4>Add New Candidate</h4>
                <div class="form-row">
                  <input 
                    v-model="newCandidate.name" 
                    type="text" 
                    class="form-control"
                    placeholder="Candidate name"
                  >
                  <input 
                    v-model="newCandidate.description" 
                    type="text" 
                    class="form-control"
                    placeholder="Candidate description"
                  >
                  <button @click="addCandidateToElection" class="btn btn-primary btn-small">
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Results & Stats Tab -->
        <section v-show="activeTab === 'results'" class="tab-content">
          <h2>Results & Statistics</h2>
          
          <div v-if="elections.length === 0" class="alert alert-info">
            No elections to display results for.
          </div>
          <div v-else>
            <div class="form-group">
              <label for="resultsElection">Select Election:</label>
              <select v-model="selectedResultsElectionId" id="resultsElection" class="form-control">
                <option value="">-- Choose an election --</option>
                <option v-for="e in elections" :key="e.id" :value="e.id">
                  {{ e.title }} ({{ e.votes_count || 0 }} votes)
                </option>
              </select>
            </div>

            <div v-if="selectedResultsElectionId" class="results-section">
              <div v-if="!selectedResultsElection" class="loading">Loading results...</div>
              <div v-else>
                <div class="results-overview">
                  <div class="stat-card">
                    <h4>Total Votes</h4>
                    <p class="stat-value">{{ selectedResultsElection.votes_count || 0 }}</p>
                  </div>
                  <div class="stat-card">
                    <h4>Registered Voters</h4>
                    <p class="stat-value">{{ selectedResultsElection.registrations_count || 0 }}</p>
                  </div>
                  <div class="stat-card">
                    <h4>Participation</h4>
                    <p class="stat-value">
                      {{ selectedResultsElection.registrations_count ? 
                        Math.round((selectedResultsElection.votes_count || 0) / selectedResultsElection.registrations_count * 100) 
                        : 0 }}%
                    </p>
                  </div>
                </div>

                <div class="results-chart">
                  <h3>Vote Distribution</h3>
                  <div v-if="selectedResultsElection.candidates && selectedResultsElection.candidates.length > 0" class="candidates-results">
                    <div v-for="candidate in selectedResultsElection.candidates" :key="candidate.id" class="candidate-result">
                      <div class="result-header">
                        <span class="candidate-rank">
                          {{ selectedResultsElection.candidates.filter(c => (c.votes_count || 0) > (candidate.votes_count || 0)).length + 1 }}.
                        </span>
                        <h4>{{ candidate.name }}</h4>
                        <span class="vote-count">{{ candidate.votes_count || 0 }} votes</span>
                      </div>
                      <div class="result-bar">
                        <div 
                          class="bar-fill" 
                          :style="{ 
                            width: selectedResultsElection.votes_count ? 
                              ((candidate.votes_count || 0) / selectedResultsElection.votes_count * 100) + '%' 
                              : 0 
                          }"
                        ></div>
                      </div>
                      <div class="result-percentage">
                        {{ selectedResultsElection.votes_count ? 
                          Math.round((candidate.votes_count || 0) / selectedResultsElection.votes_count * 100) 
                          : 0 }}%
                      </div>
                    </div>
                  </div>
                  <div v-else class="alert alert-info">No voting data available yet.</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Audit Logs Tab -->
        <section v-show="activeTab === 'audit'" class="tab-content">
          <AdminAuditLogs />
        </section>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { useElectionsStore } from '../store/elections'
import AdminAuditLogs from '../components/AdminAuditLogs.vue'

export default {
  name: 'AdminDashboard',
  components: {
    AdminAuditLogs
  },
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    const electionsStore = useElectionsStore()

    // Local state
    const activeTab = ref('elections')
    const creating = ref(false)
    const createError = ref(null)
    const createSuccess = ref(null)
    const selectedElectionId = ref('')
    const selectedResultsElectionId = ref('')
    const editingElectionId = ref(null)

    const navigationTabs = [
      { id: 'elections', label: 'Elections', icon: '📋' },
      { id: 'create', label: 'Create Election', icon: '➕' },
      { id: 'candidates', label: 'Manage Candidates', icon: '👥' },
      { id: 'results', label: 'Results & Stats', icon: '📈' },
      { id: 'audit', label: 'Audit Logs', icon: '🔐' }
    ]

    const newElection = ref({
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      candidates: [{ name: '', description: '' }]
    })

    const newCandidate = ref({
      name: '',
      description: ''
    })

    // Computed
    const elections = computed(() => electionsStore.elections)
    const loading = computed(() => electionsStore.loading)
    const error = computed(() => electionsStore.error)
    const currentUser = computed(() => authStore.currentUser)

    const selectedElection = computed(() => {
      return elections.value.find(e => e.id === parseInt(selectedElectionId.value))
    })

    const selectedResultsElection = computed(() => {
      return elections.value.find(e => e.id === parseInt(selectedResultsElectionId.value))
    })

    // Methods
    const getCurrentTabLabel = () => {
      const tab = navigationTabs.find(t => t.id === activeTab.value)
      return tab ? tab.label : 'Dashboard'
    }

    const hasElectionStarted = (election) => {
      const now = new Date()
      const startDate = new Date(election.start_date)
      return startDate <= now
    }

    const hasElectionEnded = (election) => {
      const now = new Date()
      const endDate = new Date(election.end_date)
      return endDate <= now
    }

    const createElectionHandler = async () => {
      creating.value = true
      createError.value = null
      createSuccess.value = null

      try {
        if (editingElectionId.value) {
          // Update existing election
          await electionsStore.updateElection(editingElectionId.value, {
            title: newElection.value.title,
            description: newElection.value.description,
            startDate: newElection.value.startDate,
            endDate: newElection.value.endDate,
            candidates: newElection.value.candidates.filter(c => c.name)
          })
          createSuccess.value = 'Election updated successfully!'
        } else {
          // Create new election
          await electionsStore.createElection({
            title: newElection.value.title,
            description: newElection.value.description,
            startDate: newElection.value.startDate,
            endDate: newElection.value.endDate,
            candidates: newElection.value.candidates.filter(c => c.name)
          })
          createSuccess.value = 'Election created successfully!'
        }

        resetForm()
        await electionsStore.fetchElections()
        setTimeout(() => { activeTab.value = 'elections' }, 1500)
      } catch (err) {
        createError.value = err.message
      } finally {
        creating.value = false
      }
    }

    const toggleElectionStatus = async (election) => {
      try {
        const newStatus = election.status === 'active' ? 'pending' : 'active'
        await electionsStore.updateElectionStatus(election.id, newStatus)
      } catch (err) {
        console.error('Status update error:', err)
      }
    }

    const deleteElection = async (electionId) => {
      if (!confirm('Are you sure you want to delete this election?')) return

      try {
        await electionsStore.deleteElection(electionId)
      } catch (err) {
        console.error('Delete error:', err)
      }
    }

    const deleteCandidate = async (candidateId) => {
      if (!confirm('Are you sure you want to delete this candidate?')) return

      try {
        const response = await fetch(`http://localhost:3000/api/elections/candidates/${candidateId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authStore.token}`
          }
        })

        if (!response.ok) throw new Error('Failed to delete candidate')
        await electionsStore.fetchElections()
      } catch (err) {
        alert(err.message)
      }
    }

    const addCandidateToElection = async () => {
      if (!newCandidate.value.name) {
        alert('Please enter a candidate name')
        return
      }

      try {
        const response = await fetch(`http://localhost:3000/api/elections/${selectedElectionId.value}/candidates`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authStore.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newCandidate.value)
        })

        if (!response.ok) throw new Error('Failed to add candidate')
        newCandidate.value = { name: '', description: '' }
        await electionsStore.fetchElections()
      } catch (err) {
        alert(err.message)
      }
    }

    const editElection = (election) => {
      editingElectionId.value = election.id
      newElection.value = {
        title: election.title,
        description: election.description,
        startDate: new Date(election.start_date).toISOString().slice(0, 16),
        endDate: new Date(election.end_date).toISOString().slice(0, 16),
        candidates: election.candidates || []
      }
      activeTab.value = 'create'
    }

    const addCandidate = () => {
      newElection.value.candidates.push({ name: '', description: '' })
    }

    const removeCandidate = (index) => {
      newElection.value.candidates.splice(index, 1)
    }

    const resetForm = () => {
      editingElectionId.value = null
      newElection.value = {
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        candidates: [{ name: '', description: '' }]
      }
      createError.value = null
      createSuccess.value = null
    }

    const formatDate = (dateString) => {
      const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      return new Date(dateString).toLocaleDateString(undefined, options)
    }

    const logout = async () => {
      await authStore.logout()
      await router.push('/login')
    }

    // Lifecycle
    onMounted(async () => {
      // Check user role - try from store first, then localStorage as fallback
      let user = authStore.currentUser
      if (!user) {
        // Fallback to localStorage if store not initialized
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
          try {
            user = JSON.parse(storedUser)
          } catch (e) {
            console.error('Failed to parse stored user', e)
          }
        }
      }
      
      if (!user || user.role !== 'admin') {
        await router.push('/')
        return
      }
      
      // Fetch elections
      await electionsStore.fetchElections()
    })

    return {
      activeTab,
      creating,
      createError,
      createSuccess,
      selectedElectionId,
      selectedResultsElectionId,
      editingElectionId,
      navigationTabs,
      newElection,
      newCandidate,
      elections,
      loading,
      error,
      currentUser,
      selectedElection,
      selectedResultsElection,
      getCurrentTabLabel,
      hasElectionStarted,
      hasElectionEnded,
      createElectionHandler,
      toggleElectionStatus,
      deleteElection,
      deleteCandidate,
      addCandidateToElection,
      editElection,
      addCandidate,
      removeCandidate,
      resetForm,
      formatDate,
      logout
    }
  }
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.admin-dashboard {
  display: flex;
  min-height: 100vh;
  background-color: #f5f7fa;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* ============= SIDEBAR ============= */
.admin-sidebar {
  width: 280px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  flex-direction: column;
  padding: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  position: relative;
}

.sidebar-header {
  padding: 30px 20px 20px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.logo-icon {
  font-size: 2rem;
}

.logo h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.btn-logout {
  width: 100%;
  padding: 10px;
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-logout:hover {
  background-color: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

.sidebar-nav {
  flex: 1;
  padding: 20px 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 12px;
  padding-right: 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background-color: transparent;
  color: rgba(255, 255, 255, 0.8);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.3s ease;
  text-align: left;
  width: calc(100% - 24px);
}

.nav-item:hover {
  background-color: rgba(255, 255, 255, 0.15);
  color: white;
}

.nav-item.active {
  background-color: rgba(255, 255, 255, 0.25);
  color: white;
  font-weight: 700;
  border-left: 4px solid white;
  padding-left: 12px;
}

.nav-icon {
  font-size: 1.3rem;
  min-width: 30px;
}

.nav-label {
  flex: 1;
}

.sidebar-footer {
  padding: 20px;
  border-top: 2px solid rgba(255, 255, 255, 0.2);
  text-align: center;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}

.sidebar-footer p {
  margin: 0 0 8px 0;
  font-weight: 600;
}

.sidebar-footer small {
  margin: 0;
}

/* ============= MAIN CONTENT ============= */
.admin-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.admin-header {
  background: white;
  padding: 20px 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e0e0e0;
}

.admin-header h1 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.8rem;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.admin-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
}

.admin-content {
  flex: 1;
  overflow-y: auto;
  padding: 30px;
}

.tab-content {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tab-content h2 {
  margin-top: 0;
  color: #2c3e50;
  border-bottom: 3px solid #667eea;
  padding-bottom: 15px;
  margin-bottom: 25px;
}

.tab-content h3 {
  color: #2c3e50;
  margin-top: 25px;
  margin-bottom: 15px;
}

/* ============= FORMS ============= */
.election-form {
  max-width: 900px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #2c3e50;
  font-size: 0.95rem;
}

.form-control {
  width: 100%;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.3s ease;
}

.form-control:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.candidates-input {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.candidate-input {
  display: grid;
  grid-template-columns: 1fr 1.5fr auto;
  gap: 10px;
  align-items: end;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 25px;
}

/* ============= TABLES ============= */
.elections-table {
  overflow-x: auto;
}

.elections-table table {
  width: 100%;
  border-collapse: collapse;
}

.elections-table th {
  background-color: #f8f9fa;
  padding: 15px;
  text-align: left;
  font-weight: 700;
  color: #2c3e50;
  border-bottom: 3px solid #667eea;
}

.elections-table td {
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.elections-table tr:hover {
  background-color: #f8f9fa;
}

.status-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.status-active {
  background-color: #d4edda;
  color: #155724;
}

.status-pending {
  background-color: #fff3cd;
  color: #856404;
}

.status-completed {
  background-color: #d1ecf1;
  color: #0c5460;
}

.text-center {
  text-align: center;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* ============= BUTTONS ============= */
.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.95rem;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-secondary {
  background-color: #e8e8f0;
  color: #2c3e50;
}

.btn-secondary:hover {
  background-color: #d8d8e0;
}

.btn-warning {
  background-color: #ffc107;
  color: #212529;
}

.btn-warning:hover {
  background-color: #e0a800;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-danger:hover {
  background-color: #c82333;
}

.btn-small {
  padding: 8px 12px;
  font-size: 0.85rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* ============= CARDS & ALERTS ============= */
.candidate-card {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.candidate-card h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.candidate-card p {
  margin: 0 0 12px 0;
  color: #7f8c8d;
  font-size: 0.9rem;
}

.candidate-stats {
  margin-bottom: 12px;
  font-size: 0.9rem;
  color: #667eea;
  font-weight: 600;
}

.alert {
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 6px;
  border-left: 4px solid;
}

.alert-danger {
  background-color: #f8d7da;
  color: #721c24;
  border-left-color: #dc3545;
}

.alert-success {
  background-color: #d4edda;
  color: #155724;
  border-left-color: #28a745;
}

.alert-info {
  background-color: #d1ecf1;
  color: #0c5460;
  border-left-color: #17a2b8;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
  font-size: 1.1rem;
}

/* ============= RESULTS ============= */
.results-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 25px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.stat-card h4 {
  margin: 0 0 12px 0;
  font-size: 0.95rem;
  opacity: 0.95;
  font-weight: 600;
}

.stat-value {
  margin: 0;
  font-size: 2.8rem;
  font-weight: 700;
}

.candidates-results {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.candidate-result {
  background: white;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.candidate-rank {
  font-weight: bold;
  color: #667eea;
  font-size: 1.3rem;
  width: 30px;
}

.result-header h4 {
  margin: 0;
  flex: 1;
}

.vote-count {
  font-weight: 700;
  color: #764ba2;
  font-size: 0.9rem;
}

.result-bar {
  height: 35px;
  background-color: #e0e0e0;
  border-radius: 18px;
  overflow: hidden;
  margin-bottom: 10px;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
}

.result-percentage {
  text-align: right;
  font-weight: 700;
  color: #667eea;
  font-size: 0.95rem;
}

.add-candidate-form {
  background-color: #f8f9fa;
  padding: 25px;
  border-radius: 8px;
  margin-top: 30px;
  border-left: 4px solid #667eea;
}

.add-candidate-form h4 {
  margin-top: 0;
  color: #2c3e50;
}

.add-candidate-form .form-row {
  display: grid;
  grid-template-columns: 1fr 1.5fr auto;
  gap: 10px;
  align-items: end;
}

.candidates-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
}

/* ============= RESPONSIVE ============= */
@media (max-width: 1024px) {
  .admin-sidebar {
    width: 240px;
  }

  .admin-content {
    padding: 20px;
  }

  .form-row,
  .add-candidate-form .form-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .admin-dashboard {
    flex-direction: column;
  }

  .admin-sidebar {
    width: 100%;
    height: auto;
  }

  .sidebar-nav {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 5px;
    padding-left: 10px;
    padding-right: 10px;
  }

  .nav-item {
    width: calc(50% - 8px);
    padding: 10px 12px;
    font-size: 0.9rem;
  }

  .nav-icon {
    font-size: 1.1rem;
  }

  .nav-label {
    display: none;
  }

  .nav-item.active .nav-label {
    display: block;
  }

  .admin-content {
    padding: 15px;
  }

  .tab-content {
    padding: 20px;
  }

  .elections-table {
    font-size: 0.9rem;
  }

  .elections-table td,
  .elections-table th {
    padding: 10px;
  }

  .candidate-input {
    grid-template-columns: 1fr;
  }

  .actions {
    flex-direction: column;
  }

  .actions .btn {
    width: 100%;
  }
}
</style>
