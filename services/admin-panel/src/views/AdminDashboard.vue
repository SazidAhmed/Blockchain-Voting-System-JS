<template>
  <div class="admin-dashboard">
    <AdminNavBar />
    <div class="admin-layout">
      <!-- Sidebar Navigation -->
      <aside class="admin-sidebar">
        <div class="sidebar-header">
          <div class="logo">
            <PhGear :size="28" weight="fill" />
            <h2>Admin Panel</h2>
          </div>
          <button @click="logout" class="btn btn-danger btn-logout">
            <PhSignOut :size="18" /> Logout
          </button>
        </div>

        <nav class="sidebar-nav">
          <button
            v-for="tab in navigationTabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="['nav-item', { active: activeTab === tab.id }]"
          >
            <span class="nav-icon"
              ><component :is="tab.icon" :size="20"
            /></span>
            <span class="nav-label">{{ tab.label }}</span>
          </button>
        </nav>

        <div class="sidebar-footer">
          <p>Admin Dashboard</p>
          <small>&copy; 2025 Voting System</small>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="admin-main">
        <header class="admin-header">
          <h1>{{ getCurrentTabLabel() }}</h1>
          <div class="header-info">
            <span class="admin-badge"
              ><PhShieldCheck :size="16" /> Admin User</span
            >
          </div>
        </header>

        <div class="admin-content">
          <!-- Elections Tab -->
          <section v-show="activeTab === 'elections'" class="tab-content">
            <h2>Elections Management</h2>

            <div v-if="loading" class="loading">
              <div class="spinner"></div>
              <p>Loading elections...</p>
            </div>
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
                    <td>
                      <strong>{{ election.title }}</strong>
                    </td>
                    <td>
                      <span class="badge" :class="'badge-' + election.status">
                        {{ election.status.toUpperCase() }}
                      </span>
                    </td>
                    <td>{{ formatDate(election.start_date) }}</td>
                    <td>{{ formatDate(election.end_date) }}</td>
                    <td class="text-center">
                      {{ election.candidates_count || 0 }}
                    </td>
                    <td class="text-center">{{ election.votes_count || 0 }}</td>
                    <td class="actions">
                      <button
                        v-if="election.status !== 'active'"
                        @click="editElection(election)"
                        class="btn btn-small btn-primary"
                      >
                        Edit
                      </button>
                      <button
                        v-if="election.status !== 'active'"
                        @click="promptActivate(election)"
                        class="btn btn-small btn-warning"
                      >
                        Activate
                      </button>
                      <button
                        @click="deleteElection(election.id)"
                        class="btn btn-small btn-danger"
                        :disabled="
                          election.status === 'active' &&
                          hasElectionStarted(election)
                        "
                        :title="
                          election.status === 'active' &&
                          hasElectionStarted(election)
                            ? 'Cannot delete active election after it starts'
                            : 'Delete election'
                        "
                      >
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
            <h2>
              {{ editingElectionId ? "Edit Election" : "Create New Election" }}
            </h2>
            <form @submit.prevent="createElectionHandler" class="election-form">
              <div class="form-group">
                <label for="title">Election Title *</label>
                <input
                  v-model="newElection.title"
                  type="text"
                  id="title"
                  class="form-input"
                  placeholder="e.g., Student Council President 2025"
                  required
                  :disabled="creating"
                />
              </div>

              <div class="form-group">
                <label for="description">Description</label>
                <textarea
                  v-model="newElection.description"
                  id="description"
                  class="form-input"
                  rows="4"
                  placeholder="Election description and details"
                  required
                  minlength="10"
                  :disabled="creating"
                ></textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="startDate">Start Date *</label>
                  <input
                    v-model="newElection.startDate"
                    type="datetime-local"
                    id="startDate"
                    class="form-input"
                    required
                    :disabled="creating"
                  />
                </div>

                <div class="form-group">
                  <label for="endDate">End Date *</label>
                  <input
                    v-model="newElection.endDate"
                    type="datetime-local"
                    id="endDate"
                    class="form-input"
                    required
                    :disabled="creating"
                  />
                </div>
              </div>

              <div class="form-group">
                <label>Candidates *</label>
                <div class="candidates-input">
                  <div
                    v-for="(candidate, index) in newElection.candidates"
                    :key="index"
                    class="candidate-input"
                  >
                    <input
                      v-model="candidate.name"
                      type="text"
                      class="form-input"
                      placeholder="Candidate name"
                      required
                      :disabled="creating"
                    />
                    <input
                      v-model="candidate.description"
                      type="text"
                      class="form-input"
                      placeholder="Candidate description"
                      :disabled="creating"
                    />
                    <button
                      type="button"
                      @click="removeCandidate(index)"
                      class="btn btn-danger btn-small"
                      v-if="newElection.candidates.length > 2"
                      :disabled="creating"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  @click="addCandidate"
                  class="btn btn-secondary btn-small add-candidate-btn"
                  :disabled="creating"
                >
                  + Add Candidate
                </button>
              </div>

              <div v-if="createError" class="alert alert-danger">
                {{ createError }}
              </div>
              <div v-if="createSuccess" class="alert alert-success">
                {{ createSuccess }}
              </div>

              <div v-if="creating" class="creating-indicator">
                <div class="spinner"></div>
                <span>{{
                  editingElectionId
                    ? "Updating election..."
                    : "Creating election..."
                }}</span>
              </div>

              <div class="form-actions">
                <button
                  type="submit"
                  class="btn btn-primary"
                  :disabled="creating"
                >
                  {{
                    creating
                      ? editingElectionId
                        ? "Updating..."
                        : "Creating..."
                      : editingElectionId
                        ? "Update Election"
                        : "Create Election"
                  }}
                </button>
                <button
                  type="button"
                  @click="resetForm"
                  class="btn btn-secondary"
                  :disabled="creating"
                >
                  Cancel
                </button>
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
                <select
                  v-model="selectedElectionId"
                  id="electionSelect"
                  class="form-input"
                >
                  <option value="">-- Choose an election --</option>
                  <option v-for="e in elections" :key="e.id" :value="e.id">
                    {{ e.title }}
                  </option>
                </select>
              </div>

              <div v-if="selectedElectionId" class="candidates-management">
                <h3>Candidates for: {{ selectedElection?.title }}</h3>

                <div
                  v-if="selectedElection?.candidates.length === 0"
                  class="alert alert-info"
                >
                  No candidates for this election yet.
                </div>
                <div v-else class="candidates-list">
                  <div
                    v-for="candidate in selectedElection.candidates"
                    :key="candidate.id"
                    class="candidate-card"
                  >
                    <h4>{{ candidate.name }}</h4>
                    <p>{{ candidate.description }}</p>
                    <div class="candidate-stats">
                      <span>Votes: {{ candidate.votes_count || 0 }}</span>
                    </div>
                    <button
                      v-if="selectedElection?.status !== 'active'"
                      @click="deleteCandidate(candidate.id)"
                      class="btn btn-danger btn-small"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div
                  v-if="selectedElection?.status !== 'active'"
                  class="add-candidate-form"
                >
                  <h4>Add New Candidate</h4>
                  <div class="form-row add-candidate-row">
                    <input
                      v-model="newCandidate.name"
                      type="text"
                      class="form-input"
                      placeholder="Candidate name"
                    />
                    <input
                      v-model="newCandidate.description"
                      type="text"
                      class="form-input"
                      placeholder="Candidate description"
                    />
                    <button
                      @click="addCandidateToElection"
                      class="btn btn-primary btn-small"
                    >
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
                <select
                  v-model="selectedResultsElectionId"
                  id="resultsElection"
                  class="form-input"
                >
                  <option value="">-- Choose an election --</option>
                  <option v-for="e in elections" :key="e.id" :value="e.id">
                    {{ e.title }} ({{ e.votes_count || 0 }} votes)
                  </option>
                </select>
              </div>

              <div v-if="selectedResultsElectionId" class="results-section">
                <div
                  v-if="
                    selectedResultsElectionId &&
                    selectedResultsElection &&
                    !selectedResultsElection.resultsReleased
                  "
                  class="release-bar"
                >
                  <button
                    @click="releaseResults"
                    class="btn btn-warning"
                    :disabled="releasing"
                  >
                    {{ releasing ? "Releasing..." : "Release Results" }}
                  </button>
                  <p class="release-note">
                    Results are currently encrypted. Click to make them public.
                  </p>
                </div>

                <div v-if="!selectedResultsElection" class="loading">
                  Loading results...
                </div>
                <div v-else>
                  <div class="results-overview">
                    <div class="stat-card">
                      <h4>Total Votes</h4>
                      <p class="stat-value">
                        {{ selectedResultsElection.votes_count || 0 }}
                      </p>
                    </div>
                    <div class="stat-card">
                      <h4>Registered Voters</h4>
                      <p class="stat-value">
                        {{ selectedResultsElection.registrations_count || 0 }}
                      </p>
                    </div>
                    <div class="stat-card">
                      <h4>Participation</h4>
                      <p class="stat-value">
                        {{
                          selectedResultsElection.registrations_count
                            ? Math.round(
                                ((selectedResultsElection.votes_count || 0) /
                                  selectedResultsElection.registrations_count) *
                                  100,
                              )
                            : 0
                        }}%
                      </p>
                    </div>
                  </div>

                  <div class="results-chart">
                    <h3>Vote Distribution</h3>
                    <div
                      v-if="
                        selectedResultsElection.candidates &&
                        selectedResultsElection.candidates.length > 0
                      "
                      class="candidates-results"
                    >
                      <div
                        v-for="(
                          candidate, index
                        ) in sortedSelectedResultsCandidates"
                        :key="candidate.id"
                        class="candidate-result"
                      >
                        <div class="result-header">
                          <span class="candidate-rank"> {{ index + 1 }}. </span>
                          <h4>{{ candidate.name }}</h4>
                          <span class="vote-count"
                            >{{ candidate.votes_count || 0 }} votes</span
                          >
                        </div>
                        <div class="result-bar">
                          <div
                            class="bar-fill"
                            :style="{
                              width: selectedResultsElection.votes_count
                                ? ((candidate.votes_count || 0) /
                                    selectedResultsElection.votes_count) *
                                    100 +
                                  '%'
                                : '0',
                            }"
                          ></div>
                        </div>
                        <div class="result-percentage">
                          {{
                            selectedResultsElection.votes_count
                              ? Math.round(
                                  ((candidate.votes_count || 0) /
                                    selectedResultsElection.votes_count) *
                                    100,
                                )
                              : 0
                          }}%
                        </div>
                      </div>
                    </div>
                    <div v-else class="alert alert-info">
                      No voting data available yet.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Audit Logs Tab -->
          <section v-show="activeTab === 'audit'" class="tab-content">
            <AdminAuditLogs :tab-active="activeTab === 'audit'" />
          </section>

          <!-- Institute Members Tab -->
          <section v-show="activeTab === 'members'" class="tab-content">
            <AdminInstituteMembersTab />
          </section>

          <!-- Blockchain Explorer Tab -->
          <section v-show="activeTab === 'explorer'" class="tab-content">
            <AdminBlockchainExplorer :tab-active="activeTab === 'explorer'" />
          </section>
        </div>
      </main>
    </div>

    <!-- Activate Election Confirmation Modal -->
    <div
      v-if="showActivateModal"
      class="modal-overlay"
      @click.self="showActivateModal = false"
    >
      <div class="modal-box">
        <h3>Activate Election</h3>
        <p>
          You are about to activate
          <strong>{{ pendingActivateElection?.title }}</strong
          >.
        </p>
        <p class="modal-warning">
          Once activated, the election
          <strong
            >cannot be edited, deactivated, or have candidates modified</strong
          >. Are you sure?
        </p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showActivateModal = false">
            Cancel
          </button>
          <button class="btn btn-primary" @click="confirmActivate">
            Yes, Activate
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../store/auth";
import { useElectionsStore } from "../store/elections";
import api from "../services/api";
import AdminNavBar from "../components/AdminNavBar.vue";
import AdminAuditLogs from "../components/AdminAuditLogs.vue";
import AdminInstituteMembersTab from "../components/AdminInstituteMembersTab.vue";
import AdminBlockchainExplorer from "../components/AdminBlockchainExplorer.vue";
import {
  PhList,
  PhPlusCircle,
  PhUsers,
  PhChartBar,
  PhShieldCheck,
  PhSignOut,
  PhGear,
  PhMagnifyingGlass,
} from "@phosphor-icons/vue";

export default {
  name: "AdminDashboard",
  components: {
    AdminNavBar,
    AdminAuditLogs,
    AdminInstituteMembersTab,
    AdminBlockchainExplorer,
    PhList,
    PhPlusCircle,
    PhUsers,
    PhChartBar,
    PhShieldCheck,
    PhSignOut,
    PhGear,
    PhMagnifyingGlass,
  },
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    const electionsStore = useElectionsStore();

    // Local state
    const activeTab = ref("elections");
    const creating = ref(false);
    const createError = ref(null);
    const createSuccess = ref(null);
    const selectedElectionId = ref("");
    const selectedResultsElectionId = ref("");
    const editingElectionId = ref(null);
    const showActivateModal = ref(false);
    const pendingActivateElection = ref(null);

    const navigationTabs = [
      { id: "elections", label: "Elections", icon: PhList },
      { id: "create", label: "Create Election", icon: PhPlusCircle },
      { id: "candidates", label: "Manage Candidates", icon: PhUsers },
      { id: "results", label: "Results & Stats", icon: PhChartBar },
      { id: "audit", label: "Audit Logs", icon: PhShieldCheck },
      { id: "members", label: "Institute Members", icon: PhUsers },
      { id: "explorer", label: "Blockchain Explorer", icon: PhMagnifyingGlass },
    ];

    const newElection = ref({
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      candidates: [
        { name: "", description: "" },
        { name: "", description: "" },
      ],
    });

    const newCandidate = ref({
      name: "",
      description: "",
    });

    // Computed
    const elections = computed(() => electionsStore.elections);
    const loading = computed(() => electionsStore.loading);
    const error = computed(() => electionsStore.error);

    const selectedElection = computed(() => {
      return elections.value.find(
        (e) => e.id === parseInt(selectedElectionId.value),
      );
    });

    const selectedResultsElection = computed(() => {
      return elections.value.find(
        (e) => e.id === parseInt(selectedResultsElectionId.value),
      );
    });

    const sortedSelectedResultsCandidates = computed(() => {
      if (!selectedResultsElection.value?.candidates) return [];

      return [...selectedResultsElection.value.candidates].sort((a, b) => {
        const voteDiff = (b.votes_count || 0) - (a.votes_count || 0);
        if (voteDiff !== 0) return voteDiff;
        return (a.name || "").localeCompare(b.name || "");
      });
    });

    // Methods
    const getCurrentTabLabel = () => {
      const tab = navigationTabs.find((t) => t.id === activeTab.value);
      return tab ? tab.label : "Dashboard";
    };

    const hasElectionStarted = (election) => {
      return new Date(election.start_date) <= new Date();
    };

    const createElectionHandler = async () => {
      creating.value = true;
      createError.value = null;
      createSuccess.value = null;

      try {
        if (editingElectionId.value) {
          await electionsStore.updateElection(editingElectionId.value, {
            title: newElection.value.title,
            description: newElection.value.description,
            startDate: newElection.value.startDate,
            endDate: newElection.value.endDate,
            candidates: newElection.value.candidates.filter((c) => c.name),
          });
          createSuccess.value = "Election updated successfully!";
        } else {
          await electionsStore.createElection({
            title: newElection.value.title,
            description: newElection.value.description,
            startDate: newElection.value.startDate,
            endDate: newElection.value.endDate,
            candidates: newElection.value.candidates.filter((c) => c.name),
          });
          createSuccess.value = "Election created successfully!";
        }

        await electionsStore.fetchElections();
        setTimeout(() => {
          activeTab.value = "elections";
          resetForm();
        }, 1500);
      } catch (err) {
        const fieldErrors = err.response?.data?.errors;
        if (fieldErrors && fieldErrors.length) {
          createError.value = fieldErrors
            .map((e) => `${e.field}: ${e.message}`)
            .join("; ");
        } else {
          createError.value = err.displayMessage || err.message;
        }
      } finally {
        creating.value = false;
      }
    };

    const promptActivate = (election) => {
      pendingActivateElection.value = election;
      showActivateModal.value = true;
    };

    const confirmActivate = async () => {
      try {
        await electionsStore.updateElectionStatus(
          pendingActivateElection.value.id,
          "active",
        );
      } catch (err) {
        const msg =
          err.displayMessage ||
          err.response?.data?.message ||
          "Failed to activate election.";
        alert(msg);
      } finally {
        showActivateModal.value = false;
        pendingActivateElection.value = null;
      }
    };

    const deleteElection = async (electionId) => {
      if (!confirm("Are you sure you want to delete this election?")) return;

      try {
        await electionsStore.deleteElection(electionId);
      } catch (err) {
        const msg =
          err.displayMessage ||
          err.response?.data?.message ||
          "Failed to delete election.";
        alert(msg);
      }
    };

    const deleteCandidate = async (candidateId) => {
      if (!confirm("Are you sure you want to delete this candidate?")) return;

      try {
        await api.delete(
          `/elections/${selectedElectionId.value}/candidates/${candidateId}`,
        );
        await electionsStore.fetchElections();
      } catch (err) {
        alert(err.response?.data?.message || "Failed to delete candidate");
      }
    };

    const addCandidateToElection = async () => {
      if (!newCandidate.value.name) {
        alert("Please enter a candidate name");
        return;
      }

      try {
        await api.post(
          `/elections/${selectedElectionId.value}/candidates`,
          newCandidate.value,
        );
        newCandidate.value = { name: "", description: "" };
        await electionsStore.fetchElections();
      } catch (err) {
        alert(
          err.displayMessage ||
            err.response?.data?.message ||
            "Failed to add candidate",
        );
      }
    };

    const editElection = (election) => {
      editingElectionId.value = election.id;
      newElection.value = {
        title: election.title,
        description: election.description,
        startDate: new Date(election.start_date).toISOString().slice(0, 16),
        endDate: new Date(election.end_date).toISOString().slice(0, 16),
        candidates: election.candidates || [],
      };
      activeTab.value = "create";
    };

    const addCandidate = () => {
      newElection.value.candidates.push({ name: "", description: "" });
    };

    const removeCandidate = (index) => {
      newElection.value.candidates.splice(index, 1);
    };

    const resetForm = () => {
      editingElectionId.value = null;
      newElection.value = {
        title: "",
        description: "",
        startDate: "",
        endDate: "",
        candidates: [
          { name: "", description: "" },
          { name: "", description: "" },
        ],
      };
      createError.value = null;
      createSuccess.value = null;
    };

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const logout = async () => {
      await authStore.logout();
      await router.push("/login");
    };

    const releasing = ref(false);

    const releaseResults = async () => {
      if (!selectedResultsElectionId.value) return;
      releasing.value = true;
      try {
        await api.post(`/elections/${selectedResultsElectionId.value}/release`);
        await electionsStore.fetchElections();
      } catch (err) {
        alert(
          err.displayMessage ||
            err.response?.data?.message ||
            "Failed to release results",
        );
      } finally {
        releasing.value = false;
      }
    };

    // Refresh data when switching to certain tabs
    watch(activeTab, (tab) => {
      if (tab === "results" || tab === "audit") {
        electionsStore.fetchElections();
      }
    });

    // Lifecycle
    onMounted(async () => {
      const hasToken = localStorage.getItem("admin_token");
      if (!hasToken) {
        await router.push("/login");
        return;
      }

      await authStore.fetchCurrentUser();

      if (
        !authStore.isAuthenticated ||
        !authStore.currentUser ||
        authStore.currentUser.role !== "admin"
      ) {
        await router.push("/login");
        return;
      }

      await electionsStore.fetchElections();
    });

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
      selectedElection,
      selectedResultsElection,
      sortedSelectedResultsCandidates,
      showActivateModal,
      pendingActivateElection,
      releasing,
      getCurrentTabLabel,
      hasElectionStarted,
      createElectionHandler,
      promptActivate,
      confirmActivate,
      deleteElection,
      deleteCandidate,
      addCandidateToElection,
      editElection,
      addCandidate,
      removeCandidate,
      resetForm,
      formatDate,
      logout,
      releaseResults,
    };
  },
};
</script>

<style scoped>
.admin-dashboard {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--bg-secondary);
  font-family: var(--font-sans);
}

.admin-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ============= SIDEBAR ============= */
.admin-sidebar {
  width: 280px;
  background: var(--accent-gradient);
  color: white;
  display: flex;
  flex-direction: column;
  padding: 0;
  box-shadow: var(--shadow-lg);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
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
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-size: 0.9rem;
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
  border-radius: var(--radius-sm);
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
  min-width: 30px;
  display: flex;
  align-items: center;
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
  background: var(--bg-card);
  padding: 20px 30px;
  box-shadow: var(--shadow);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
}

.admin-header h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.8rem;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.admin-badge {
  background: var(--accent-gradient);
  color: white;
  padding: 8px 16px;
  border-radius: var(--radius-xl);
  font-size: 0.9rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.admin-content {
  flex: 1;
  overflow-y: auto;
  padding: 30px;
}

.tab-content {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 30px;
  box-shadow: var(--shadow);
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
  color: var(--text-primary);
  border-bottom: 3px solid var(--accent);
  padding-bottom: 15px;
  margin-bottom: 25px;
}

.tab-content h3 {
  color: var(--text-primary);
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
  color: var(--text-primary);
  font-size: 0.95rem;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 1rem;
  font-family: var(--font-sans);
  color: var(--text-primary);
  background: var(--bg-primary);
  transition: border-color 0.3s ease;
  outline: none;
}

.form-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
}

.form-input[type="datetime-local"] {
  color-scheme: light dark;
}

:root[data-theme="dark"]
  .form-input[type="datetime-local"]::-webkit-calendar-picker-indicator {
  filter: invert(1) brightness(1.35);
}

:root[data-theme="light"]
  .form-input[type="datetime-local"]::-webkit-calendar-picker-indicator {
  filter: none;
}

.form-input::placeholder {
  color: var(--text-muted);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
}

.candidates-input {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.candidate-input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr) auto;
  gap: 16px;
  align-items: start;
  padding: 10px 0;
}

.candidate-input .form-input {
  min-width: 0;
}

.candidate-input .btn-danger {
  align-self: stretch;
  white-space: nowrap;
}

.candidate-input .form-input:first-child {
  min-width: 180px;
}

.candidate-input .form-input:nth-child(2) {
  min-width: 240px;
}

@media (max-width: 720px) {
  .form-row,
  .candidate-input {
    grid-template-columns: 1fr;
  }
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 25px;
}

.creating-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  border-radius: var(--radius-md);
  color: var(--accent);
  font-weight: 600;
  margin-top: 16px;
}

.creating-indicator .spinner {
  width: 20px;
  height: 20px;
  border-width: 2px;
}

.add-candidate-btn {
  margin-top: 12px;
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
  background-color: var(--bg-secondary);
  padding: 15px;
  text-align: left;
  font-weight: 700;
  color: var(--text-primary);
  border-bottom: 3px solid var(--accent);
}

.elections-table td {
  padding: 15px;
  border-bottom: 1px solid var(--border);
}

.elections-table tr:hover {
  background-color: var(--bg-secondary);
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
  border-radius: var(--radius-md);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.95rem;
  font-family: var(--font-sans);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}

.btn-primary {
  background: var(--accent-gradient);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 30%, transparent);
}

.btn-secondary {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.btn-warning {
  background-color: var(--warning);
  color: var(--text-primary);
}

.btn-warning:hover {
  background-color: color-mix(in srgb, var(--warning) 85%, black);
}

.btn-danger {
  background-color: var(--error);
  color: white;
}

.btn-danger:hover {
  background-color: color-mix(in srgb, var(--error) 85%, black);
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
  background: var(--bg-secondary);
  padding: 20px;
  border-radius: var(--radius-md);
  border-left: 4px solid var(--accent);
}

.candidate-card h4 {
  margin: 0 0 10px 0;
  color: var(--text-primary);
}

.candidate-card p {
  margin: 0 0 12px 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.candidate-stats {
  margin-bottom: 12px;
  font-size: 0.9rem;
  color: var(--accent);
  font-weight: 600;
}

.alert {
  padding: 15px;
  margin-bottom: 20px;
  border-radius: var(--radius-md);
  border-left: 4px solid;
}

.alert-danger {
  background-color: color-mix(in srgb, var(--error) 10%, transparent);
  color: var(--error);
  border-left-color: var(--error);
}

.alert-success {
  background-color: color-mix(in srgb, var(--success) 10%, transparent);
  color: var(--success);
  border-left-color: var(--success);
}

.alert-info {
  background-color: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--accent);
  border-left-color: var(--accent);
}

.loading {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
  font-size: 1.1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ============= BADGES ============= */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.badge-active {
  background: color-mix(in srgb, var(--success) 20%, transparent);
  color: var(--success);
}

.badge-pending {
  background: color-mix(in srgb, var(--warning) 20%, transparent);
  color: var(--warning);
}

.badge-completed {
  background: color-mix(in srgb, var(--accent-secondary) 20%, transparent);
  color: var(--accent-secondary);
}

/* ============= RESULTS ============= */
.results-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: var(--accent-gradient);
  color: white;
  padding: 25px;
  border-radius: var(--radius-lg);
  text-align: center;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 20%, transparent);
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
  background: var(--bg-card);
  padding: 20px;
  border-radius: var(--radius-md);
  border-left: 4px solid var(--accent);
}

.result-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.candidate-rank {
  font-weight: bold;
  color: var(--accent);
  font-size: 1.3rem;
  width: 30px;
}

.result-header h4 {
  margin: 0;
  flex: 1;
}

.vote-count {
  font-weight: 700;
  color: var(--accent-secondary);
  font-size: 0.9rem;
}

.result-bar {
  height: 35px;
  background-color: var(--border);
  border-radius: 18px;
  overflow: hidden;
  margin-bottom: 10px;
}

.bar-fill {
  height: 100%;
  background: var(--accent-gradient);
  transition: width 0.3s ease;
}

.result-percentage {
  text-align: right;
  font-weight: 700;
  color: var(--accent);
  font-size: 0.95rem;
}

.release-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  background: color-mix(in srgb, var(--warning) 10%, transparent);
  border-radius: var(--radius-md);
  border-left: 4px solid var(--warning);
}
.release-note {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin: 0;
}

.add-candidate-form {
  background-color: var(--bg-secondary);
  padding: 25px;
  border-radius: var(--radius-md);
  margin-top: 30px;
  border-left: 4px solid var(--accent);
}

.add-candidate-form h4 {
  margin-top: 0;
  color: var(--text-primary);
}

.add-candidate-row {
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

/* ============= MODAL ============= */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-box {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 2rem;
  max-width: 440px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}

.modal-box h3 {
  margin: 0 0 0.75rem;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.modal-box p {
  margin: 0 0 0.5rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.modal-warning {
  color: var(--error) !important;
  font-size: 0.9rem;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.25rem;
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
  .add-candidate-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .admin-layout {
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
