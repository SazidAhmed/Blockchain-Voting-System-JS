<template>
  <div class="elections-container">
    <h1>Available Elections</h1>
    
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading elections...</p>
    </div>
    
    <div v-else-if="error" class="alert alert-danger">
      {{ error }}
    </div>
    
    <div v-else-if="elections.length === 0" class="no-elections">
      <p>No elections are currently available.</p>
      <div v-if="isAdmin" class="admin-actions">
        <router-link to="/admin/dashboard" class="btn btn-primary">Create New Election</router-link>
      </div>
    </div>
    
    <div v-else class="elections-list">
      <div v-for="election in elections" :key="election.id" class="election-card">
        <div class="election-status" :class="election.status">
          {{ formatStatus(election.status) }}
        </div>
        <h2>{{ election.title }}</h2>
        <p class="election-description">{{ election.description }}</p>
        <div class="election-dates">
          <div class="date-item">
            <span class="date-label">Start:</span>
            <span class="date-value">{{ formatDate(election.start_date) }}</span>
          </div>
          <div class="date-item">
            <span class="date-label">End:</span>
            <span class="date-value">{{ formatDate(election.end_date) }}</span>
          </div>
        </div>
        <div class="election-actions">
          <router-link :to="`/elections/${election.id}`" class="btn btn-primary">
            View Details
          </router-link>
        </div>
      </div>
    </div>
    
    <div v-if="isAdmin" class="admin-actions">
      <router-link to="/admin/dashboard" class="btn btn-primary">Admin Dashboard</router-link>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'ElectionsView',
  computed: {
    ...mapGetters(['isAdmin', 'getElections', 'isLoading', 'getError']),
    elections() {
      return this.getElections
    },
    loading() {
      return this.isLoading
    },
    error() {
      return this.getError
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
    }
  },
  created() {
    this.$store.dispatch('fetchElections')
  }
}
</script>

<style scoped>
.elections-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  margin-bottom: 30px;
  color: #2c3e50;
  text-align: center;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
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

.no-elections {
  text-align: center;
  padding: 40px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.elections-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 30px;
}

.election-card {
  position: relative;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 25px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.election-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.election-status {
  position: absolute;
  top: 15px;
  right: 15px;
  padding: 5px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: bold;
  text-transform: uppercase;
}

.election-status.pending {
  background-color: #e0f7fa;
  color: #0097a7;
}

.election-status.active {
  background-color: #e8f5e9;
  color: #388e3c;
}

.election-status.completed {
  background-color: #ede7f6;
  color: #5e35b1;
}

.election-status.cancelled {
  background-color: #ffebee;
  color: #d32f2f;
}

.election-card h2 {
  margin-top: 10px;
  margin-bottom: 15px;
  color: #2c3e50;
  font-size: 1.5rem;
}

.election-description {
  color: #7f8c8d;
  margin-bottom: 20px;
  line-height: 1.5;
}

.election-dates {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  font-size: 0.9rem;
}

.date-label {
  font-weight: bold;
  color: #34495e;
  margin-right: 5px;
}

.date-value {
  color: #7f8c8d;
}

.election-actions {
  display: flex;
  justify-content: center;
}

.btn {
  display: inline-block;
  padding: 10px 20px;
  border-radius: 4px;
  text-decoration: none;
  font-weight: bold;
  transition: all 0.3s ease;
}

.btn-primary {
  background-color: #3498db;
  color: white;
}

.btn-primary:hover {
  background-color: #2980b9;
}

.admin-actions {
  margin-top: 40px;
  text-align: center;
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