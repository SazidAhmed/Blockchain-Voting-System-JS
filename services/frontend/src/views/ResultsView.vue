<template>
  <div class="page">
    <h1 class="page-title">Election Results</h1>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading results...</p>
    </div>

    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else-if="elections.length === 0" class="empty-state card glass">
      <PhChartBar :size="48" color="var(--text-muted)" />
      <p>No elections found.</p>
    </div>

    <div v-else>
      <div class="selector-bar">
        <label class="form-label" for="electionPicker">Select Election:</label>
        <select
          id="electionPicker"
          v-model="selectedId"
          @change="loadElection"
          class="form-input"
        >
          <option v-for="e in elections" :key="e.id" :value="e.id">
            {{ e.title }} ({{ formatStatus(e.status) }})
          </option>
        </select>
      </div>

      <div v-if="current" class="results-card card glass">
        <div class="card-header">
          <div>
            <h2>{{ current.title }}</h2>
            <p class="sub">{{ current.description }}</p>
          </div>
          <span class="badge" :class="'badge-' + current.status">{{
            formatStatus(current.status)
          }}</span>
        </div>

        <div class="stats-row">
          <div class="stat-box glass">
            <PhCheckSquare :size="18" color="var(--accent)" />
            <span class="stat-label">Total Votes</span>
            <span class="stat-value gradient-text">{{ totalVotes }}</span>
          </div>
          <div class="stat-box glass">
            <PhUsers :size="18" color="var(--accent)" />
            <span class="stat-label">Candidates</span>
            <span class="stat-value gradient-text">{{
              current.candidates ? current.candidates.length : 0
            }}</span>
          </div>
          <div class="stat-box glass">
            <PhCalendarCheck :size="18" color="var(--accent)" />
            <span class="stat-label">Start Date</span>
            <span class="stat-value date">{{
              formatDate(current.start_date)
            }}</span>
          </div>
          <div class="stat-box glass">
            <PhCalendarCheck :size="18" color="var(--accent)" />
            <span class="stat-label">End Date</span>
            <span class="stat-value date">{{
              formatDate(current.end_date)
            }}</span>
          </div>
        </div>

        <div
          v-if="!current.candidates || current.candidates.length === 0"
          class="empty-state"
        >
          <p>No candidates for this election.</p>
        </div>

        <div v-else class="chart">
          <div v-if="!current.resultsReleased" class="pending-results">
            <PhLock :size="48" color="var(--text-muted)" />
            <h3>Results Not Yet Released</h3>
            <p>
              Vote totals are shown live, but candidate breakdown stays hidden
              until the admin releases the results.
            </p>
          </div>

          <template
            v-else-if="current.candidates && current.candidates.length > 0"
          >
            <div
              v-for="(candidate, idx) in sortedCandidates"
              :key="candidate.id"
              class="result-row"
            >
              <div class="row-header">
                <span
                  class="rank"
                  :class="[
                    'rank-' +
                      (idx < 3 ? ['gold', 'silver', 'bronze'][idx] : ''),
                  ]"
                  >{{ idx + 1 }}</span
                >
                <span class="cname">{{ candidate.name }}</span>
                <span class="vcount"
                  >{{ candidate.votes_count || 0 }} votes</span
                >
              </div>
              <div class="bar-track">
                <div
                  class="bar-fill"
                  :style="{ width: pct(candidate) + '%' }"
                ></div>
              </div>
              <div class="bar-pct">{{ pct(candidate) }}%</div>
            </div>
          </template>
        </div>
      </div>

      <div v-else-if="detailLoading" class="loading">
        <div class="spinner"></div>
      </div>
    </div>
  </div>
</template>

<script>
import api from "@/services/api";
import {
  PhChartBar,
  PhCheckSquare,
  PhUsers,
  PhCalendarCheck,
  PhLock,
} from "@phosphor-icons/vue";

export default {
  name: "ResultsView",
  components: { PhChartBar, PhCheckSquare, PhUsers, PhCalendarCheck, PhLock },
  data() {
    return {
      elections: [],
      selectedId: null,
      current: null,
      loading: true,
      detailLoading: false,
      resultsReleased: false,
      error: null,
    };
  },
  computed: {
    totalVotes() {
      if (!this.current) return 0;
      if (typeof this.current.totalVotes === "number")
        return this.current.totalVotes;
      if (!this.current.candidates) return 0;
      return this.current.candidates.reduce(
        (s, c) => s + (c.votes_count || 0),
        0,
      );
    },
    sortedCandidates() {
      if (!this.current || !this.current.candidates) return [];
      return [...this.current.candidates].sort(
        (a, b) => (b.votes_count || 0) - (a.votes_count || 0),
      );
    },
  },
  methods: {
    pct(candidate) {
      if (!this.totalVotes) return 0;
      return Math.round(((candidate.votes_count || 0) / this.totalVotes) * 100);
    },
    formatStatus(s) {
      return (
        {
          pending: "Upcoming",
          active: "Active",
          completed: "Completed",
          cancelled: "Cancelled",
        }[s] || s
      );
    },
    formatDate(d) {
      return new Date(d).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    async loadElection() {
      if (!this.selectedId) return;
      this.detailLoading = true;
      this.current = null;
      this.resultsReleased = false;
      try {
        const res = await api.get(`/elections/${this.selectedId}`);
        this.current = res.data;
        this.resultsReleased = this.current.resultsReleased;
      } catch (e) {
        this.error =
          e.displayMessage ||
          e.response?.data?.message ||
          "Failed to load election results.";
        console.error(e);
      } finally {
        this.detailLoading = false;
      }
    },
  },
  async mounted() {
    try {
      const res = await api.get("/elections");
      this.elections = res.data;

      if (this.elections.length > 0) {
        const active = this.elections.find((e) => e.status === "active");
        this.selectedId = active ? active.id : this.elections[0].id;
        await this.loadElection();
      }
    } catch (e) {
      this.error =
        e.displayMessage ||
        e.response?.data?.message ||
        "Failed to load elections.";
      console.error(e);
    } finally {
      this.loading = false;
    }
  },
};
</script>

<style scoped>
.page-title {
  text-align: center;
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: var(--space-8);
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-10);
  gap: var(--space-3);
  color: var(--text-muted);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-12);
  text-align: center;
}

.selector-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.selector-bar .form-label {
  white-space: nowrap;
}

.selector-bar .form-input {
  flex: 1;
}

.results-card {
  padding: var(--space-8);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-6);
}

.card-header h2 {
  font-size: 1.5rem;
  color: var(--text-primary);
  margin: 0 0 4px;
}
.card-header .sub {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin: 0;
}

.stats-row {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
  margin-bottom: var(--space-8);
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-4) var(--space-5);
  border-radius: var(--radius-lg);
  min-width: 100px;
  flex: 1;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-muted);
}
.stat-value {
  font-size: 1.7rem;
  font-weight: 700;
}
.stat-value.date {
  font-size: 0.85rem;
  text-align: center;
}

.chart {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.row-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: 6px;
}

.rank {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: 700;
  font-size: 0.9rem;
  background: var(--bg-secondary);
  color: var(--text-muted);
  flex-shrink: 0;
}

.rank-gold {
  background: #ffd700;
  color: #7a5800;
}
.rank-silver {
  background: #c0c0c0;
  color: #444;
}
.rank-bronze {
  background: #cd7f32;
  color: #fff;
}

.cname {
  font-weight: 600;
  flex: 1;
  color: var(--text-primary);
}
.vcount {
  font-size: 0.85rem;
  color: var(--accent);
  font-weight: 600;
}

.bar-track {
  height: 14px;
  background: var(--bg-secondary);
  border-radius: 8px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: var(--accent-gradient);
  border-radius: 8px;
  transition: width 0.6s ease;
}

.bar-pct {
  font-size: 0.78rem;
  color: var(--text-muted);
  text-align: right;
  margin-top: 2px;
}

.pending-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-12);
  text-align: center;
  color: var(--text-muted);
}
.pending-results h3 {
  color: var(--text-primary);
  margin: 0;
}
.pending-results p {
  margin: 0;
}

.alert {
  padding: 15px;
  border-radius: var(--radius-md);
  border-left: 4px solid;
  margin-bottom: 20px;
}

.alert-danger {
  background-color: color-mix(in srgb, var(--error) 10%, transparent);
  color: var(--error);
  border-left-color: var(--error);
}
</style>
