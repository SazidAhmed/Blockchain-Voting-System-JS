<template>
  <div class="admin-dashboard">
    <header class="admin-header">
      <h1>📊 Admin Dashboard</h1>
      <div class="header-actions">
        <span class="admin-badge">Admin</span>
        <button @click="logout" class="btn btn-danger">Logout</button>
      </div>
    </header>

    <div class="admin-container">
      <nav class="admin-nav">
        <ul>
          <li :class="{ active: activeTab === 'elections' }">
            <button @click="activeTab = 'elections'" class="nav-link">
              📋 Elections
            </button>
          </li>
          <li :class="{ active: activeTab === 'create' }">
            <button @click="activeTab = 'create'" class="nav-link">
              ➕ Create Election
            </button>
          </li>
          <li :class="{ active: activeTab === 'candidates' }">
            <button @click="activeTab = 'candidates'" class="nav-link">
              👥 Manage Candidates
            </button>
          </li>
          <li :class="{ active: activeTab === 'results' }">
            <button @click="activeTab = 'results'" class="nav-link">
              📈 Results & Stats
            </button>
          </li>
          <li :class="{ active: activeTab === 'audit' }">
            <button @click="activeTab = 'audit'" class="nav-link">
              🔐 Audit Logs
            </button>
          </li>
        </ul>
      </nav>

      <main class="admin-content">
        <!-- Elections Tab -->
        <section v-if="activeTab === 'elections'" class="tab-content">
          <h2>Elections Management</h2>
          
          <div v-if="loading" class="loading">Loading elections...</div>
          <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
          <div v-else-if="elections.length === 0" class="alert alert-info">
            No elections found. <router-link to="/admin/dashboard?tab=create">Create one now</router-link>
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
                    <button @click="editElection(election)" class="btn btn-small btn-primary">Edit</button>
                    <button @click="toggleElectionStatus(election)" class="btn btn-small btn-warning">
                      {{ election.status === 'active' ? 'Deactivate' : 'Activate' }}
                    </button>
                    <button @click="deleteElection(election.id)" class="btn btn-small btn-danger">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Create Election Tab -->
        <section v-if="activeTab === 'create'" class="tab-content">
          <h2>Create New Election</h2>
          <form @submit.prevent="createElection" class="election-form">
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
                {{ creating ? 'Creating...' : 'Create Election' }}
              </button>
              <button type="button" @click="resetForm" class="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </section>

        <!-- Manage Candidates Tab -->
        <section v-if="activeTab === 'candidates'" class="tab-content">
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
        <section v-if="activeTab === 'results'" class="tab-content">
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
        <section v-if="activeTab === 'audit'" class="tab-content">
          <AdminAuditLogs />
        </section>
      </main>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import AdminAuditLogs from '../components/AdminAuditLogs.vue'

export default {
  name: 'AdminDashboard',
  components: {
    AdminAuditLogs
  },
  data() {
    return {
      activeTab: 'elections',
      elections: [],
      loading: false,
      error: null,
      creating: false,
      createError: null,
      createSuccess: null,
      selectedElectionId: '',
      selectedResultsElectionId: '',
      newElection: {
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        candidates: [
          { name: '', description: '' }
        ]
      },
      newCandidate: {
        name: '',
        description: ''
      }
    }
  },
  computed: {
    ...mapGetters(['currentUser']),
    selectedElection() {
      return this.elections.find(e => e.id === parseInt(this.selectedElectionId))
    },
    selectedResultsElection() {
      return this.elections.find(e => e.id === parseInt(this.selectedResultsElectionId))
    }
  },
  methods: {
    async fetchElections() {
      this.loading = true
      this.error = null
      try {
        const response = await fetch('http://localhost:3000/api/elections/admin', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        if (!response.ok) throw new Error('Failed to fetch elections')
        this.elections = await response.json()
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },
    async createElection() {
      this.creating = true
      this.createError = null
      this.createSuccess = null

      try {
        const response = await fetch('http://localhost:3000/api/elections', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: this.newElection.title,
            description: this.newElection.description,
            startDate: this.newElection.startDate,
            endDate: this.newElection.endDate,
            candidates: this.newElection.candidates.filter(c => c.name)
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'Failed to create election')
        }

        this.createSuccess = 'Election created successfully!'
        this.resetForm()
        await this.fetchElections()
        setTimeout(() => { this.activeTab = 'elections' }, 1500)
      } catch (err) {
        this.createError = err.message
      } finally {
        this.creating = false
      }
    },
    async toggleElectionStatus(election) {
      const newStatus = election.status === 'active' ? 'pending' : 'active'
      try {
        const response = await fetch(`http://localhost:3000/api/elections/${election.id}/status`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: newStatus })
        })

        if (!response.ok) throw new Error('Failed to update election status')
        await this.fetchElections()
      } catch (err) {
        this.error = err.message
      }
    },
    async deleteElection(electionId) {
      if (!confirm('Are you sure you want to delete this election?')) return

      try {
        const response = await fetch(`http://localhost:3000/api/elections/${electionId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })

        if (!response.ok) throw new Error('Failed to delete election')
        await this.fetchElections()
      } catch (err) {
        this.error = err.message
      }
    },
    async deleteCandidate(candidateId) {
      if (!confirm('Are you sure you want to delete this candidate?')) return

      try {
        const response = await fetch(`http://localhost:3000/api/candidates/${candidateId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })

        if (!response.ok) throw new Error('Failed to delete candidate')
        await this.fetchElections()
      } catch (err) {
        this.error = err.message
      }
    },
    async addCandidateToElection() {
      if (!this.newCandidate.name) {
        alert('Please enter a candidate name')
        return
      }

      try {
        const response = await fetch(`http://localhost:3000/api/elections/${this.selectedElectionId}/candidates`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(this.newCandidate)
        })

        if (!response.ok) throw new Error('Failed to add candidate')
        this.newCandidate = { name: '', description: '' }
        await this.fetchElections()
      } catch (err) {
        alert(err.message)
      }
    },
    editElection(election) {
      this.newElection = {
        title: election.title,
        description: election.description,
        startDate: new Date(election.start_date).toISOString().slice(0, 16),
        endDate: new Date(election.end_date).toISOString().slice(0, 16),
        candidates: election.candidates || []
      }
      this.activeTab = 'create'
    },
    addCandidate() {
      this.newElection.candidates.push({ name: '', description: '' })
    },
    removeCandidate(index) {
      this.newElection.candidates.splice(index, 1)
    },
    resetForm() {
      this.newElection = {
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        candidates: [{ name: '', description: '' }]
      }
      this.createError = null
      this.createSuccess = null
    },
    formatDate(dateString) {
      const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      return new Date(dateString).toLocaleDateString(undefined, options)
    },
    logout() {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      this.$router.push('/login')
    }
  },
  mounted() {
    if (!this.currentUser || this.currentUser.role !== 'admin') {
      this.$router.push('/')
      return
    }
    this.fetchElections()
  }
}
</script>

<style scoped>
.admin-dashboard {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.admin-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.admin-header h1 {
  margin: 0;
  font-size: 2rem;
}

.header-actions {
  display: flex;
  gap: 15px;
  align-items: center;
}

.admin-badge {
  background-color: rgba(255, 255, 255, 0.3);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
}

.admin-container {
  display: flex;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  gap: 20px;
}

.admin-nav {
  width: 200px;
}

.admin-nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.admin-nav li {
  margin-bottom: 10px;
}

.nav-link {
  display: block;
  width: 100%;
  padding: 12px 16px;
  border: none;
  border-radius: 6px;
  background-color: white;
  cursor: pointer;
  text-align: left;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  color: #2c3e50;
}

.nav-link:hover {
  background-color: #e8e8ff;
  transform: translateX(4px);
}

.admin-nav li.active .nav-link {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
}

.admin-content {
  flex: 1;
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tab-content h2 {
  margin-top: 0;
  color: #2c3e50;
  border-bottom: 2px solid #667eea;
  padding-bottom: 15px;
  margin-bottom: 25px;
}

.elections-table {
  overflow-x: auto;
}

.elections-table table {
  width: 100%;
  border-collapse: collapse;
}

.elections-table th {
  background-color: #f8f9fa;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 2px solid #e0e0e0;
}

.elections-table td {
  padding: 12px;
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
}

.election-form {
  max-width: 800px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #2c3e50;
}

.form-control {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
}

.form-control:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
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

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
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
  padding: 6px 12px;
  font-size: 0.9rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.alert {
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 6px;
}

.alert-danger {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.alert-success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.alert-info {
  background-color: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
}

.candidates-management {
  margin-top: 30px;
}

.candidates-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
}

.candidate-card {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.candidate-card h4 {
  margin: 0 0 8px 0;
  color: #2c3e50;
}

.candidate-card p {
  margin: 0 0 10px 0;
  color: #7f8c8d;
  font-size: 0.9rem;
}

.candidate-stats {
  margin-bottom: 10px;
  font-size: 0.9rem;
  color: #667eea;
  font-weight: 600;
}

.add-candidate-form {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-top: 20px;
}

.add-candidate-form h4 {
  margin-top: 0;
}

.add-candidate-form .form-row {
  display: grid;
  grid-template-columns: 1fr 1.5fr auto;
  gap: 10px;
  align-items: end;
}

.results-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
}

.stat-card h4 {
  margin: 0 0 10px 0;
  font-size: 0.9rem;
  opacity: 0.9;
}

.stat-value {
  margin: 0;
  font-size: 2.5rem;
  font-weight: bold;
}

.results-chart {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.candidates-results {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.candidate-result {
  background: white;
  padding: 15px;
  border-radius: 6px;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.candidate-rank {
  font-weight: bold;
  color: #667eea;
  font-size: 1.2rem;
  width: 25px;
}

.result-header h4 {
  margin: 0;
  flex: 1;
}

.vote-count {
  font-weight: 600;
  color: #764ba2;
  font-size: 0.9rem;
}

.result-bar {
  height: 30px;
  background-color: #e0e0e0;
  border-radius: 15px;
  overflow: hidden;
  margin-bottom: 8px;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transition: width 0.3s ease;
}

.result-percentage {
  text-align: right;
  font-weight: 600;
  color: #667eea;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .admin-container {
    flex-direction: column;
  }

  .admin-nav {
    width: 100%;
  }

  .admin-nav ul {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .form-row,
  .candidate-input,
  .add-candidate-form .form-row {
    grid-template-columns: 1fr;
  }

  .actions {
    flex-wrap: wrap;
  }

  .elections-table {
    font-size: 0.9rem;
  }

  .elections-table td,
  .elections-table th {
    padding: 8px;
  }
}
</style>
