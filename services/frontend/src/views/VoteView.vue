<template>
  <div class="page">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading voting interface...</p>
    </div>

    <div v-else-if="error" class="alert alert-danger">
      {{ error }}
    </div>

    <div v-else-if="!election" class="empty-state card glass">
      <PhXCircle :size="48" color="var(--text-muted)" />
      <h2>Election Not Found</h2>
      <p>
        The election you're trying to vote in doesn't exist or has been removed.
      </p>
      <router-link to="/elections" class="btn btn-primary"
        >Back to Elections</router-link
      >
    </div>

    <div
      v-else-if="election.status !== 'active'"
      class="empty-state card glass"
    >
      <PhWarning :size="48" color="var(--warning)" />
      <h2>Voting Not Available</h2>
      <p>This election is not currently active for voting.</p>
      <router-link to="/elections" class="btn btn-primary"
        >Back to Elections</router-link
      >
    </div>

    <div v-else-if="alreadyVoted" class="vote-success">
      <div class="success-card card glass">
        <PhChecks :size="64" weight="fill" color="var(--accent-secondary)" />
        <h2>You've Already Voted</h2>
        <p>
          Your vote in this election has been recorded. You cannot vote again.
        </p>
        <div class="actions">
          <router-link to="/elections" class="btn btn-primary">
            <PhArchive :size="16" /> Back to Elections
          </router-link>
        </div>
      </div>
    </div>

    <div v-else-if="voteSubmitted" class="vote-success">
      <div class="success-card card glass">
        <PhCheckCircle :size="64" weight="fill" color="var(--success)" />
        <h2>Vote Successfully Cast!</h2>
        <p>
          Your vote has been securely encrypted and recorded on the blockchain.
        </p>

        <VoteReceipt :receipt="voteReceipt" />

        <div class="actions">
          <router-link to="/elections" class="btn btn-primary">
            <PhArchive :size="16" /> Back to Elections
          </router-link>
        </div>
      </div>
    </div>

    <div v-else class="voting-interface">
      <h1 class="page-title">Cast Your Vote</h1>
      <div class="election-info card glass">
        <h2>{{ election.title }}</h2>
        <p>{{ election.description }}</p>
      </div>

      <div class="voting-form card glass">
        <h3>Select a Candidate</h3>
        <div class="candidates-list">
          <div
            v-for="candidate in election.candidates"
            :key="candidate.id"
            class="candidate-option"
            :class="{ selected: selectedCandidate === candidate.id }"
            @click="selectCandidate(candidate.id)"
          >
            <div class="selection-indicator"></div>
            <div class="candidate-info">
              <h4>{{ candidate.name }}</h4>
              <p>{{ candidate.description }}</p>
            </div>
            <PhCheckCircle
              v-if="selectedCandidate === candidate.id"
              :size="20"
              weight="fill"
              color="var(--accent)"
            />
          </div>
        </div>

        <div class="crypto-status" v-if="hasKeys">
          <div class="alert alert-success">
            <PhLock :size="16" weight="fill" />
            <strong>Cryptographic Keys Loaded</strong> — Your vote will be
            encrypted and digitally signed.
          </div>
        </div>

        <div class="crypto-status" v-else>
          <div class="alert alert-warning">
            <PhWarning :size="16" weight="fill" />
            <strong>Keys Not Loaded</strong> — Please login again to load your
            cryptographic keys.
          </div>
        </div>

        <div v-if="encryptingVote" class="alert alert-info">
          <PhSpinner :size="16" class="spinning" /> Encrypting your vote...
          Please wait.
        </div>

        <div class="confirmation-section">
          <div class="alert alert-info">
            <PhInfo :size="16" weight="fill" /> <strong>Important:</strong> Your
            vote is encrypted and will be recorded on the blockchain. Once
            submitted, it cannot be changed.
          </div>

          <button
            @click="showConfirmModal = true"
            class="btn btn-primary btn-vote"
            :disabled="!canSubmitVote || submitting"
          >
            <PhCheckSquare :size="18" /> Submit Vote
          </button>
        </div>
      </div>
    </div>

    <AppModal
      :show="showConfirmModal"
      type="warning"
      title="Confirm Your Vote"
      message="Once submitted, your vote cannot be changed. Are you sure you want to proceed?"
      confirmText="Yes, Cast Vote"
      :showCancel="true"
      @confirm="confirmAndSubmit"
      @cancel="showConfirmModal = false"
    />
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import api from "@/services/api";
import keyManager from "@/services/keyManager";
import VoteReceipt from "@/components/VoteReceipt.vue";
import AppModal from "@/components/AppModal.vue";
import {
  PhCheckCircle,
  PhXCircle,
  PhWarning,
  PhArchive,
  PhLock,
  PhSpinner,
  PhInfo,
  PhCheckSquare,
  PhChecks,
} from "@phosphor-icons/vue";

export default {
  name: "VoteView",
  components: {
    VoteReceipt,
    AppModal,
    PhCheckCircle,
    PhXCircle,
    PhWarning,
    PhArchive,
    PhLock,
    PhSpinner,
    PhInfo,
    PhCheckSquare,
    PhChecks,
  },
  data() {
    return {
      electionId: this.$route.params.id,
      selectedCandidate: this.$route.query.candidateId || null,
      submitting: false,
      voteSubmitted: false,
      alreadyVoted: false,
      voteReceipt: null,
      localError: null,
      encryptingVote: false,
      showConfirmModal: false,
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
    canSubmitVote() {
      return this.selectedCandidate && keyManager.getCurrentKeys() !== null;
    },
    hasKeys() {
      return keyManager.getCurrentKeys() !== null;
    },
  },
  methods: {
    selectCandidate(candidateId) {
      this.selectedCandidate = candidateId;
    },
    confirmAndSubmit() {
      this.showConfirmModal = false;
      this.submitVote();
    },
    async submitVote() {
      if (!this.canSubmitVote) return;

      this.submitting = true;
      this.encryptingVote = true;
      this.localError = null;

      try {
        if (!keyManager.getCurrentKeys()) {
          throw new Error("Cryptographic keys not loaded. Please login again.");
        }

        const votePackage = await keyManager.generateVote(
          { candidateId: this.selectedCandidate },
          this.electionId,
          this.election.public_key || this.election.publicKey,
        );

        this.encryptingVote = false;

        const response = await this.$store.dispatch("castVote", {
          electionId: this.electionId,
          voteData: votePackage,
        });

        this.voteSubmitted = true;
        this.voteReceipt = response.receipt;
        this.showSuccessModal = true;
      } catch (error) {
        this.localError =
          error.message ||
          error.response?.data?.message ||
          "Failed to submit vote. Please try again.";
        console.error("Vote submission error:", error);
      } finally {
        this.submitting = false;
        this.encryptingVote = false;
      }
    },
  },
  async created() {
    await this.$store.dispatch("fetchElection", this.electionId);

    // Check if user already voted
    try {
      const res = await api.get(
        `/elections/${this.electionId}/registration-status`,
      );
      if (res.data.status === "voted") {
        this.alreadyVoted = true;
        return;
      }
    } catch (e) {
      // Silently fail — backend will still reject double votes
    }

    if (!keyManager.getCurrentKeys() && this.currentUser) {
      try {
        if (
          keyManager.hasStoredKeys(
            this.currentUser.studentId || this.currentUser.id,
          )
        ) {
          this.localError =
            "Please provide your password to load your voting keys.";
        }
      } catch (error) {
        console.error("Failed to load keys:", error);
        this.localError =
          "Failed to load cryptographic keys. Please login again.";
      }
    }
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

.page-title {
  text-align: center;
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: var(--space-6);
}

.election-info {
  padding: var(--space-6);
  margin-bottom: var(--space-6);
}

.election-info h2 {
  margin-bottom: var(--space-2);
  color: var(--text-primary);
}

.election-info p {
  color: var(--text-secondary);
  line-height: 1.6;
}

.voting-form {
  padding: var(--space-8);
}

.voting-form h3 {
  margin-bottom: var(--space-5);
  color: var(--text-primary);
  font-size: 1.2rem;
}

.candidates-list {
  margin-bottom: var(--space-6);
}

.candidate-option {
  display: flex;
  align-items: center;
  padding: var(--space-4);
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-3);
  cursor: pointer;
  transition: all 0.2s;
}

.candidate-option:hover {
  border-color: var(--border-hover);
}

.candidate-option.selected {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 5%, transparent);
}

.selection-indicator {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid var(--border);
  margin-right: var(--space-4);
  position: relative;
  flex-shrink: 0;
}

.candidate-option.selected .selection-indicator {
  border-color: var(--accent);
}

.candidate-option.selected .selection-indicator::after {
  content: "";
  position: absolute;
  width: 10px;
  height: 10px;
  background: var(--accent);
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.candidate-info {
  flex: 1;
}

.candidate-info h4 {
  margin-bottom: 4px;
  color: var(--text-primary);
}

.candidate-info p {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.crypto-status {
  margin-bottom: var(--space-5);
}

.confirmation-section {
  text-align: center;
}

.btn-vote {
  padding: 14px 32px;
  font-size: 1.05rem;
}

.success-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-10);
  text-align: center;
  gap: var(--space-4);
  max-width: 600px;
  margin: 0 auto;
}

.success-card h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.success-card p {
  color: var(--text-secondary);
}

.actions {
  display: flex;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.spinning {
  animation: spin 0.7s linear infinite;
}

.alert {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.9rem;
  text-align: left;
}

.alert-success {
  background: color-mix(in srgb, var(--success) 10%, transparent);
  color: var(--success);
  border: 1px solid color-mix(in srgb, var(--success) 25%, transparent);
}

.alert-warning {
  background: color-mix(in srgb, var(--warning) 10%, transparent);
  color: var(--warning);
  border: 1px solid color-mix(in srgb, var(--warning) 25%, transparent);
}

.alert-danger {
  background: color-mix(in srgb, var(--error) 10%, transparent);
  color: var(--error);
  border: 1px solid color-mix(in srgb, var(--error) 25%, transparent);
}

.alert-info {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
}
</style>
