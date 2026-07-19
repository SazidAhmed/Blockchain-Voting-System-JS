<template>
  <div class="page">
    <h1 class="page-title">Available Elections</h1>

    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading elections...</p>
    </div>

    <div v-else-if="error" class="alert alert-danger">
      {{ error }}
    </div>

    <div v-else-if="elections.length === 0" class="empty-state card glass">
      <PhArchive :size="48" color="var(--text-muted)" />
      <p>No elections are currently available.</p>
    </div>

    <div v-else class="elections-grid">
      <div
        v-for="election in elections"
        :key="election.id"
        class="election-card card glass"
      >
        <div class="election-header">
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
        <h2 class="election-title">{{ election.title }}</h2>
        <p class="election-description">{{ election.description }}</p>
        <div class="election-dates">
          <div class="date-item">
            <PhCalendarCheck :size="14" color="var(--text-muted)" />
            <span class="date-label">Start:</span>
            <span class="date-value">{{
              formatDate(election.start_date)
            }}</span>
          </div>
          <div class="date-item">
            <PhCalendarCheck :size="14" color="var(--text-muted)" />
            <span class="date-label">End:</span>
            <span class="date-value">{{ formatDate(election.end_date) }}</span>
          </div>
        </div>
        <div class="election-actions">
          <router-link
            v-if="election.status === 'active' && !election._userVoted"
            :to="`/elections/${election.id}/vote`"
            class="btn btn-primary"
          >
            <PhCheckSquare :size="16" /> Cast Your Vote
          </router-link>
          <span
            v-else-if="election.status === 'active' && election._userVoted"
            class="btn btn-ghost voted-badge"
          >
            <PhChecks :size="16" /> Already Voted
          </span>
          <span v-else class="btn btn-ghost" style="cursor: default">
            {{ formatStatus(election.status) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import {
  PhArchive,
  PhCheckCircle,
  PhClock,
  PhChecks,
  PhXCircle,
  PhCalendarCheck,
  PhCheckSquare,
} from "@phosphor-icons/vue";

export default {
  name: "ElectionsView",
  components: {
    PhArchive,
    PhCheckCircle,
    PhClock,
    PhChecks,
    PhXCircle,
    PhCalendarCheck,
    PhCheckSquare,
  },
  computed: {
    ...mapGetters(["getElections", "isLoading", "getError"]),
    elections() {
      const order = { active: 0, pending: 1, completed: 2, cancelled: 3 };
      return [...this.getElections].sort(
        (a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9),
      );
    },
    loading() {
      return this.isLoading;
    },
    error() {
      return this.getError;
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
    async checkVoteStatuses() {
      const token = localStorage.getItem("token");
      if (!token) return;
      const activeElections = this.getElections.filter(
        (e) => e.status === "active",
      );
      for (const election of activeElections) {
        try {
          const res = await fetch(
            `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/elections/${election.id}/registration-status`,
            { headers: { "x-auth-token": token } },
          );
          if (res.ok) {
            const data = await res.json();
            if (data.status === "voted") {
              election._userVoted = true;
            }
          }
        } catch (e) {
          /* silent */
        }
      }
    },
  },
  async created() {
    await this.$store.dispatch("fetchElections");
    await this.checkVoteStatuses();
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
  justify-content: center;
  padding: var(--space-12);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-12);
  text-align: center;
}

.elections-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: var(--space-6);
}

.election-card {
  padding: var(--space-6);
}

.election-header {
  margin-bottom: var(--space-3);
}

.election-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.election-description {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: var(--space-4);
}

.election-dates {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
}

.date-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.85rem;
}

.date-label {
  font-weight: 600;
  color: var(--text-secondary);
}

.date-value {
  color: var(--text-muted);
}

.election-actions {
  display: flex;
  justify-content: center;
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

.voted-badge {
  color: var(--accent-secondary);
  cursor: default;
}
</style>
