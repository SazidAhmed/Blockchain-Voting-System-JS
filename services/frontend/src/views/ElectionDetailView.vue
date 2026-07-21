<template>
  <div class="page">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading election details...</p>
    </div>

    <div v-else-if="error" class="alert alert-danger">
      {{ error }}
    </div>

    <div v-else-if="!election" class="empty-state card glass">
      <PhXCircle :size="48" color="var(--text-muted)" />
      <h2>Election Not Found</h2>
      <p>The election you're looking for doesn't exist or has been removed.</p>
      <router-link to="/elections" class="btn btn-primary"
        >Back to Elections</router-link
      >
    </div>

    <div v-else class="election-detail">
      <div class="election-header card glass">
        <div class="header-top">
          <span class="badge" :class="'badge-' + election.status">
            <PhCheckCircle
              v-if="election.status === 'active'"
              :size="12"
              weight="fill"
            />
            <PhClock
              v-else-if="election.status === 'pending'"
              :size="12"
              weight="fill"
            />
            <PhChecks
              v-else-if="election.status === 'completed'"
              :size="12"
              weight="fill"
            />
            <PhXCircle v-else :size="12" weight="fill" />
            {{ formatStatus(election.status) }}
          </span>
        </div>
        <h1>{{ election.title }}</h1>
        <p class="description">{{ election.description }}</p>
      </div>

      <div class="election-info">
        <div class="info-card card glass">
          <h3>
            <PhCalendarCheck :size="18" color="var(--accent)" /> Election Period
          </h3>
          <div class="date-item">
            <span class="date-label">Start:</span>
            <span class="date-value">{{
              formatDate(election.start_date)
            }}</span>
          </div>
          <div class="date-item">
            <span class="date-label">End:</span>
            <span class="date-value">{{ formatDate(election.end_date) }}</span>
          </div>
        </div>

        <div class="info-card card glass">
          <h3><PhUserCheck :size="18" color="var(--accent)" /> Registration</h3>
          <div v-if="isRegistered">
            <p class="registered-status">
              <PhCheckCircle :size="16" weight="fill" color="var(--success)" />
              You are registered for this election
            </p>
          </div>
          <div v-else>
            <button
              @click="registerForElection"
              class="btn btn-primary"
              :disabled="!canRegister || registrationLoading"
            >
              <PhSpinner
                v-if="registrationLoading"
                :size="16"
                class="spinning"
              />
              {{ registrationLoading ? "Registering..." : "Register to Vote" }}
            </button>
            <p v-if="!canRegister" class="registration-note">
              Registration is not available for this election
            </p>
          </div>
        </div>
      </div>

      <div
        v-if="election.candidates && election.candidates.length > 0"
        class="results-section"
      >
        <h2>Results</h2>
        <div class="results-summary">
          <div class="stat-box glass">
            <span class="stat-label">Total Votes</span>
            <span class="stat-value gradient-text">{{ totalVotes }}</span>
          </div>
        </div>
        <div class="results-chart card glass">
          <div
            v-for="(candidate, idx) in sortedCandidates"
            :key="candidate.id"
            class="result-bar"
          >
            <div class="result-rank-name">
              <span class="rank">{{ idx + 1 }}.</span>
              <span class="cname">{{ candidate.name }}</span>
              <span class="vcount">{{ candidate.votes_count || 0 }} votes</span>
            </div>
            <div class="bar-container">
              <div
                class="bar"
                :style="{ width: candidatePercent(candidate) + '%' }"
              ></div>
            </div>
            <div class="bar-pct">{{ candidatePercent(candidate) }}%</div>
          </div>
        </div>
      </div>

      <div class="actions">
        <router-link to="/elections" class="btn btn-secondary">
          <PhArrowLeft :size="16" /> Back to Elections
        </router-link>
        <button
          v-if="canVote"
          @click="$router.push(`/elections/${election.id}/vote`)"
          class="btn btn-primary"
        >
          <PhCheckSquare :size="16" /> Cast Your Vote
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import api from "@/services/api";
import {
  PhCheckCircle,
  PhClock,
  PhChecks,
  PhXCircle,
  PhCalendarCheck,
  PhUserCheck,
  PhSpinner,
  PhArrowLeft,
  PhCheckSquare,
} from "@phosphor-icons/vue";

export default {
  name: "ElectionDetailView",
  components: {
    PhCheckCircle,
    PhClock,
    PhChecks,
    PhXCircle,
    PhCalendarCheck,
    PhUserCheck,
    PhSpinner,
    PhArrowLeft,
    PhCheckSquare,
  },
  data() {
    return {
      registrationLoading: false,
      localError: null,
      isRegistered: false,
    };
  },
  computed: {
    ...mapGetters([
      "getCurrentElection",
      "isLoading",
      "getError",
      "currentUser",
    ]),
    election() {
      return this.getCurrentElection;
    },
    loading() {
      return this.isLoading;
    },
    error() {
      return this.getError || this.localError;
    },
    canRegister() {
      if (!this.election) return false;
      return ["pending", "active"].includes(this.election.status);
    },
    canVote() {
      if (!this.election) return false;
      return this.election.status === "active";
    },
    totalVotes() {
      if (!this.election || !this.election.candidates) return 0;
      return this.election.candidates.reduce(
        (s, c) => s + (c.votes_count || 0),
        0,
      );
    },
    sortedCandidates() {
      if (!this.election || !this.election.candidates) return [];
      return [...this.election.candidates].sort(
        (a, b) => (b.votes_count || 0) - (a.votes_count || 0),
      );
    },
  },
  methods: {
    formatDate(dateString) {
      const options = {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      };
      return new Date(dateString).toLocaleDateString(undefined, options);
    },
    formatStatus(status) {
      const statusMap = {
        pending: "Upcoming",
        active: "Active",
        completed: "Completed",
        cancelled: "Cancelled",
      };
      return statusMap[status] || status;
    },
    candidatePercent(candidate) {
      if (!this.totalVotes) return 0;
      return Math.round(((candidate.votes_count || 0) / this.totalVotes) * 100);
    },
    async registerForElection() {
      this.registrationLoading = true;
      this.localError = null;

      try {
        await this.$store.dispatch("registerForElection", this.election.id);
        this.isRegistered = true;
      } catch (error) {
        this.localError =
          "Failed to register for this election. Please try again.";
        console.error("Registration error:", error);
      } finally {
        this.registrationLoading = false;
      }
    },
    async checkRegistrationStatus() {
      try {
        const res = await api.get(
          `/elections/${this.$route.params.id}/registration-status`,
        );
        this.isRegistered = res.data.registered;
      } catch (e) {
        // Silently fail
      }
    },
  },
  async created() {
    const electionId = this.$route.params.id;
    await this.$store.dispatch("fetchElection", electionId);
    await this.checkRegistrationStatus();
  },
};
</script>

<style scoped>
.loading,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12);
  text-align: center;
  gap: var(--space-4);
}

.election-header {
  padding: var(--space-8);
  margin-bottom: var(--space-6);
}

.header-top {
  margin-bottom: var(--space-3);
}

.election-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  padding-right: 100px;
  margin-bottom: var(--space-3);
}

.description {
  color: var(--text-secondary);
  line-height: 1.6;
}

.election-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-5);
  margin-bottom: var(--space-8);
}

.info-card {
  padding: var(--space-6);
}

.info-card h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  font-size: 1.1rem;
  color: var(--text-primary);
}

.date-item {
  margin-bottom: var(--space-2);
  font-size: 0.9rem;
}

.date-label {
  font-weight: 600;
  color: var(--text-secondary);
  margin-right: var(--space-2);
}

.date-value {
  color: var(--text-muted);
}

.registered-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--success);
  font-weight: 600;
}

.registration-note {
  margin-top: var(--space-3);
  color: var(--error);
  font-size: 0.9rem;
}

.results-section {
  margin-bottom: var(--space-8);
}

.results-section h2 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: var(--space-5);
}

.results-summary {
  margin-bottom: var(--space-5);
}

.stat-box {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-4) var(--space-8);
  border-radius: var(--radius-lg);
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-muted);
}
.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
}

.results-chart {
  padding: var(--space-6);
}

.result-bar {
  margin-bottom: var(--space-4);
}

.result-rank-name {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: 6px;
}

.rank {
  font-weight: 700;
  color: var(--accent);
  min-width: 24px;
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

.bar-container {
  height: 14px;
  background: var(--bg-secondary);
  border-radius: 8px;
  overflow: hidden;
}

.bar {
  height: 100%;
  background: var(--accent-gradient);
  border-radius: 8px;
  transition: width 0.6s ease;
}

.bar-pct {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-align: right;
  margin-top: 2px;
}

.actions {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-8);
}

.spinning {
  animation: spin 0.7s linear infinite;
}

.alert {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-6);
}

.alert-danger {
  background: color-mix(in srgb, var(--error) 10%, transparent);
  color: var(--error);
  border: 1px solid color-mix(in srgb, var(--error) 25%, transparent);
}
</style>
