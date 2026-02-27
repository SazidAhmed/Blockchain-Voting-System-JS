<template>
  <div class="election-detail-container">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading election details...</p>
    </div>
    
    <div v-else-if="error" class="alert alert-danger">
      {{ error }}
    </div>
    
    <div v-else-if="!election" class="not-found">
      <h2>Election Not Found</h2>
      <p>The election you're looking for doesn't exist or has been removed.</p>
      <router-link to="/elections" class="btn btn-primary">Back to Elections</router-link>
    </div>
    
    <div v-else class="election-detail">
      <div class="election-header">
        <div class="status-badge" :class="election.status">
          {{ formatStatus(election.status) }}
        </div>
        <h1>{{ election.title }}</h1>
        <p class="description">{{ election.description }}</p>
      </div>
      
      <div class="election-info">
        <div class="info-card">
          <h3>Election Period</h3>
          <div class="date-item">
            <span class="date-label">Start:</span>
            <span class="date-value">{{ formatDate(election.start_date) }}</span>
          </div>
          <div class="date-item">
            <span class="date-label">End:</span>
            <span class="date-value">{{ formatDate(election.end_date) }}</span>
          </div>
        </div>
        
        <div class="info-card">
          <h3>Registration</h3>
          <div v-if="isRegistered">
            <p class="registered-status">You are registered for this election</p>
          </div>
          <div v-else>
            <button 
              @click="registerForElection" 
              class="btn btn-primary" 
              :disabled="!canRegister || registrationLoading"
            >
              {{ registrationLoading ? 'Registering...' : 'Register to Vote' }}
            </button>
            <p v-if="!canRegister" class="registration-note">
              Registration is not available for this election
            </p>
          </div>
        </div>
      </div>
      
      <div class="candidates-section">
        <h2>Candidates</h2>
        <div v-if="!election.candidates || election.candidates.length === 0" class="no-candidates">
          <p>No candidates have been added to this election yet.</p>
        </div>
        <div v-else class="candidates-list">
          <div v-for="candidate in election.candidates" :key="candidate.id" class="candidate-card">
            <h3>{{ candidate.name }}</h3>
            <p>{{ candidate.description }}</p>
            <button 
              v-if="canVote" 
              @click="goToVote(candidate.id)" 
              class="btn btn-vote"
            >
              Vote for this candidate
            </button>
          </div>
        </div>
      </div>
      
      <div v-if="election.candidates && election.candidates.length > 0" class="results-section">
        <h2>Results</h2>
        <div class="results-summary">
          <div class="stat-box"><span class="stat-label">Total Votes</span><span class="stat-value">{{ totalVotes }}</span></div>
        </div>
        <div class="results-chart">
          <div v-for="(candidate, idx) in sortedCandidates" :key="candidate.id" class="result-bar">
            <div class="result-rank-name">
              <span class="rank">{{ idx + 1 }}.</span>
              <span class="cname">{{ candidate.name }}</span>
              <span class="vcount">{{ candidate.votes_count || 0 }} votes</span>
            </div>
            <div class="bar-container">
              <div class="bar" :style="{ width: candidatePercent(candidate) + '%' }"></div>
            </div>
            <div class="bar-pct">{{ candidatePercent(candidate) }}%</div>
          </div>
        </div>
      </div>
      
      <div class="actions">
        <router-link to="/elections" class="btn btn-secondary">Back to Elections</router-link>
        <button 
          v-if="canVote" 
          @click="$router.push(`/elections/${election.id}/vote`)" 
          class="btn btn-primary"
        >
          Cast Your Vote
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'ElectionDetailView',
  data() {
    return {
      registrationLoading: false,
      localError: null
    }
  },
  computed: {
    ...mapGetters(['getCurrentElection', 'isLoading', 'getError', 'currentUser']),
    election() {
      return this.getCurrentElection
    },
    loading() {
      return this.isLoading
    },
    error() {
      return this.getError || this.localError
    },
    isRegistered() {
      // For now, assume all logged-in users are registered
      // TODO: Check actual registration status from backend
      return true
    },
    canRegister() {
      if (!this.election) return false
      return ['pending', 'active'].includes(this.election.status)
    },
    canVote() {
      if (!this.election) return false
      // Allow voting if election is active
      return this.election.status === 'active'
    },
    totalVotes() {
      if (!this.election || !this.election.candidates) return 0
      return this.election.candidates.reduce((s, c) => s + (c.votes_count || 0), 0)
    },
    sortedCandidates() {
      if (!this.election || !this.election.candidates) return []
      return [...this.election.candidates].sort((a, b) => (b.votes_count || 0) - (a.votes_count || 0))
    }
  },
  methods: {
    formatDate(dateString) {
      const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      return new Date(dateString).toLocaleDateString(undefined, options)
    },
    formatStatus(status) {
      const statusMap = {
        'pending': 'Upcoming',
        'active': 'Active',
        'completed': 'Completed',
        'cancelled': 'Cancelled'
      }
      return statusMap[status] || status
    },
    candidatePercent(candidate) {
      if (!this.totalVotes) return 0
      return Math.round(((candidate.votes_count || 0) / this.totalVotes) * 100)
    },
    async registerForElection() {
      this.registrationLoading = true
      this.localError = null
      
      try {
        await this.$store.dispatch('registerForElection', this.election.id)
        // Refresh election details to update registration status
        await this.$store.dispatch('fetchElection', this.election.id)
      } catch (error) {
        this.localError = 'Failed to register for this election. Please try again.'
        console.error('Registration error:', error)
      } finally {
        this.registrationLoading = false
      }
    },
    goToVote(candidateId) {
      this.$router.push({
        path: `/elections/${this.election.id}/vote`,
        query: { candidateId }
      })
    }
  },
  created() {
    const electionId = this.$route.params.id
    this.$store.dispatch('fetchElection', electionId)
  }
}
</script>

<style scoped>
.election-detail-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.loading, .not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: #3498db;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.election-header {
  position: relative;
  background-color: #f8f9fa;
  padding: 30px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.status-badge {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: bold;
  text-transform: uppercase;
}

.status-badge.pending {
  background-color: #e0f7fa;
  color: #0097a7;
}

.status-badge.active {
  background-color: #e8f5e9;
  color: #388e3c;
}

.status-badge.completed {
  background-color: #ede7f6;
  color: #5e35b1;
}

.status-badge.cancelled {
  background-color: #ffebee;
  color: #d32f2f;
}

h1 {
  margin-bottom: 15px;
  color: #2c3e50;
  padding-right: 100px; /* Make room for the status badge */
}

.description {
  color: #7f8c8d;
  line-height: 1.6;
}

.election-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.info-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.info-card h3 {
  margin-bottom: 15px;
  color: #2c3e50;
  font-size: 1.2rem;
}

.date-item {
  margin-bottom: 10px;
}

.date-label {
  font-weight: bold;
  color: #34495e;
  margin-right: 5px;
}

.date-value {
  color: #7f8c8d;
}

.registered-status {
  color: #27ae60;
  font-weight: bold;
}

.registration-note {
  margin-top: 10px;
  color: #e74c3c;
  font-size: 0.9rem;
}

.candidates-section, .results-section {
  margin-bottom: 30px;
}

.candidates-section h2, .results-section h2 {
  margin-bottom: 20px;
  color: #2c3e50;
}

.no-candidates {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  color: #7f8c8d;
}

.candidates-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.candidate-card {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 20px;
  transition: transform 0.2s ease;
}

.candidate-card:hover {
  transform: translateY(-3px);
}

.candidate-card h3 {
  margin-bottom: 10px;
  color: #2c3e50;
}

.candidate-card p {
  color: #7f8c8d;
  margin-bottom: 15px;
  line-height: 1.5;
}

.btn-vote {
  background-color: #2ecc71;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;
}

.btn-vote:hover {
  background-color: #27ae60;
}

.results-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}
.stat-box {
  background: linear-gradient(135deg, #6c63ff, #a855f7);
  color: #fff;
  border-radius: 10px;
  padding: 14px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 120px;
}
.stat-label { font-size: 0.8rem; opacity: 0.85; }
.stat-value { font-size: 1.8rem; font-weight: 700; }

.result-bar {
  margin-bottom: 18px;
}
.result-rank-name {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.rank { font-weight: 700; color: #6c63ff; min-width: 24px; }
.cname { font-weight: 600; flex: 1; color: #2c3e50; }
.vcount { font-size: 0.85rem; color: #6c63ff; font-weight: 600; }

.bar-container {
  position: relative;
  height: 14px;
  background-color: #ecf0f1;
  border-radius: 8px;
  overflow: hidden;
}
.bar {
  height: 100%;
  background: linear-gradient(90deg, #6c63ff, #a855f7);
  border-radius: 8px;
  transition: width 0.6s ease;
}
.bar-pct {
  font-size: 0.8rem;
  color: #888;
  text-align: right;
  margin-top: 2px;
}

.actions {
  display: flex;
  justify-content: space-between;
  margin-top: 30px;
}

.btn {
  display: inline-block;
  padding: 10px 20px;
  border-radius: 4px;
  text-decoration: none;
  font-weight: bold;
  transition: all 0.3s ease;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background-color: #3498db;
  color: white;
}

.btn-primary:hover {
  background-color: #2980b9;
}

.btn-secondary {
  background-color: #ecf0f1;
  color: #2c3e50;
}

.btn-secondary:hover {
  background-color: #bdc3c7;
}

.btn:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.alert {
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 4px;
}

.alert-danger {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}
</style>