<template>
  <div class="results-page">
    <h1>Election Results</h1>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading results...</p>
    </div>

    <div v-else-if="elections.length === 0" class="empty">
      <p>No elections found.</p>
    </div>

    <div v-else>
      <!-- Election selector -->
      <div class="selector-bar">
        <label for="electionPicker">Select Election:</label>
        <select id="electionPicker" v-model="selectedId" @change="loadElection" class="election-select">
          <option v-for="e in elections" :key="e.id" :value="e.id">
            {{ e.title }} ({{ formatStatus(e.status) }})
          </option>
        </select>
      </div>

      <!-- Results card -->
      <div v-if="current" class="results-card">
        <div class="card-header">
          <div>
            <h2>{{ current.title }}</h2>
            <p class="sub">{{ current.description }}</p>
          </div>
          <span class="status-badge" :class="current.status">{{ formatStatus(current.status) }}</span>
        </div>

        <div class="stats-row">
          <div class="stat-box">
            <span class="stat-label">Total Votes</span>
            <span class="stat-value">{{ totalVotes }}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Candidates</span>
            <span class="stat-value">{{ current.candidates ? current.candidates.length : 0 }}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Start Date</span>
            <span class="stat-value date">{{ formatDate(current.start_date) }}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">End Date</span>
            <span class="stat-value date">{{ formatDate(current.end_date) }}</span>
          </div>
        </div>

        <div v-if="!current.candidates || current.candidates.length === 0" class="empty">
          <p>No candidates for this election.</p>
        </div>

        <div v-else class="chart">
          <div v-for="(candidate, idx) in sortedCandidates" :key="candidate.id" class="result-row">
            <div class="row-header">
              <span class="rank" :class="{ gold: idx === 0, silver: idx === 1, bronze: idx === 2 }">{{ idx + 1 }}</span>
              <span class="cname">{{ candidate.name }}</span>
              <span class="vcount">{{ candidate.votes_count || 0 }} votes</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: pct(candidate) + '%' }"></div>
            </div>
            <div class="bar-pct">{{ pct(candidate) }}%</div>
          </div>
        </div>
      </div>

      <div v-else-if="detailLoading" class="loading">
        <div class="spinner"></div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ResultsView',
  data() {
    return {
      elections: [],
      selectedId: null,
      current: null,
      loading: true,
      detailLoading: false,
    }
  },
  computed: {
    totalVotes() {
      if (!this.current || !this.current.candidates) return 0
      return this.current.candidates.reduce((s, c) => s + (c.votes_count || 0), 0)
    },
    sortedCandidates() {
      if (!this.current || !this.current.candidates) return []
      return [...this.current.candidates].sort((a, b) => (b.votes_count || 0) - (a.votes_count || 0))
    }
  },
  methods: {
    pct(candidate) {
      if (!this.totalVotes) return 0
      return Math.round(((candidate.votes_count || 0) / this.totalVotes) * 100)
    },
    formatStatus(s) {
      return { pending: 'Upcoming', active: 'Active', completed: 'Completed', cancelled: 'Cancelled' }[s] || s
    },
    formatDate(d) {
      return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    },
    async loadElection() {
      if (!this.selectedId) return
      this.detailLoading = true
      this.current = null
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`http://localhost:3000/api/elections/${this.selectedId}`, {
          headers: { 'x-auth-token': token }
        })
        this.current = await res.json()
      } catch (e) {
        console.error(e)
      } finally {
        this.detailLoading = false
      }
    }
  },
  async mounted() {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:3000/api/elections', {
        headers: { 'x-auth-token': token }
      })
      this.elections = await res.json()

      if (this.elections.length > 0) {
        // Default: most recent active, else most recent overall
        const active = this.elections.find(e => e.status === 'active')
        this.selectedId = active ? active.id : this.elections[0].id
        await this.loadElection()
      }
    } catch (e) {
      console.error(e)
    } finally {
      this.loading = false
    }
  }
}
</script>

<style scoped>
.results-page {
  max-width: 860px;
  margin: 0 auto;
  padding: 28px 20px;
}

h1 {
  font-size: 1.8rem;
  color: #2c3e50;
  margin-bottom: 24px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  gap: 12px;
  color: #888;
}
.spinner {
  border: 4px solid rgba(0,0,0,0.1);
  width: 36px; height: 36px;
  border-radius: 50%;
  border-left-color: #6c63ff;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.empty { text-align: center; color: #888; padding: 40px; }

.selector-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}
.selector-bar label { font-weight: 600; color: #444; white-space: nowrap; }
.election-select {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  background: #fff;
  cursor: pointer;
}

.results-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  padding: 28px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}
.card-header h2 { font-size: 1.5rem; color: #2c3e50; margin: 0 0 4px; }
.card-header .sub { color: #888; font-size: 0.9rem; margin: 0; }

.status-badge {
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  white-space: nowrap;
}
.status-badge.active   { background: #d4edda; color: #155724; }
.status-badge.pending  { background: #fff3cd; color: #856404; }
.status-badge.completed{ background: #ede7f6; color: #5e35b1; }
.status-badge.cancelled{ background: #ffebee; color: #d32f2f; }

.stats-row {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 28px;
}
.stat-box {
  background: linear-gradient(135deg, #6c63ff, #a855f7);
  color: #fff;
  border-radius: 10px;
  padding: 14px 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 100px;
  flex: 1;
}
.stat-label { font-size: 0.75rem; opacity: 0.85; }
.stat-value { font-size: 1.7rem; font-weight: 700; }
.stat-value.date { font-size: 0.85rem; text-align: center; margin-top: 2px; }

.chart { display: flex; flex-direction: column; gap: 18px; }

.result-row {}
.row-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.rank {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  font-weight: 700;
  font-size: 0.9rem;
  background: #ecf0f1;
  color: #555;
  flex-shrink: 0;
}
.rank.gold   { background: #FFD700; color: #7a5800; }
.rank.silver { background: #C0C0C0; color: #444; }
.rank.bronze { background: #CD7F32; color: #fff; }

.cname { font-weight: 600; flex: 1; color: #2c3e50; }
.vcount { font-size: 0.85rem; color: #6c63ff; font-weight: 600; }

.bar-track {
  height: 14px;
  background: #ecf0f1;
  border-radius: 8px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #6c63ff, #a855f7);
  border-radius: 8px;
  transition: width 0.6s ease;
}
.bar-pct { font-size: 0.78rem; color: #999; text-align: right; margin-top: 2px; }
</style>
