<template>
  <div class="vote-container">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading voting interface...</p>
    </div>
    
    <div v-else-if="error" class="alert alert-danger">
      {{ error }}
    </div>
    
    <div v-else-if="!election" class="not-found">
      <h2>Election Not Found</h2>
      <p>The election you're trying to vote in doesn't exist or has been removed.</p>
      <router-link to="/elections" class="btn btn-primary">Back to Elections</router-link>
    </div>
    
    <div v-else-if="election.status !== 'active'" class="not-active">
      <h2>Voting Not Available</h2>
      <p>This election is not currently active for voting.</p>
      <router-link :to="`/elections/${electionId}`" class="btn btn-primary">View Election Details</router-link>
    </div>
    
    <div v-else-if="voteSubmitted" class="vote-success">
      <div class="success-icon">✓</div>
      <h2>Vote Successfully Cast!</h2>
      <p>Your vote has been securely encrypted and recorded on the blockchain.</p>
      
      <VoteReceipt :receipt="voteReceipt" />
      
      <div class="actions">
        <router-link :to="`/elections/${electionId}`" class="btn btn-primary">Back to Election</router-link>
        <router-link to="/elections" class="btn btn-secondary">All Elections</router-link>
      </div>
    </div>
    
    <div v-else class="voting-interface">
      <h1>Cast Your Vote</h1>
      <div class="election-info">
        <h2>{{ election.title }}</h2>
        <p>{{ election.description }}</p>
      </div>
      
      <div class="voting-form">
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
          </div>
        </div>
        
        <div class="crypto-status" v-if="hasKeys">
          <div class="alert alert-success">
            <strong>✓ Cryptographic Keys Loaded</strong><br>
            Your vote will be encrypted and digitally signed.
          </div>
        </div>
        
        <div class="crypto-status" v-else>
          <div class="alert alert-warning">
            <strong>⚠ Keys Not Loaded</strong><br>
            Please login again to load your cryptographic keys.
          </div>
        </div>
        
        <div v-if="encryptingVote" class="alert alert-info">
          🔐 Encrypting your vote... Please wait.
        </div>
        
        <div class="confirmation-section">
          <div class="alert alert-info">
            <strong>Important:</strong> Your vote is encrypted and will be recorded on the blockchain.
            Once submitted, it cannot be changed. Please verify your selection before submitting.
          </div>
          
          <button 
            @click="submitVote" 
            class="btn btn-primary btn-vote" 
            :disabled="!canSubmitVote || submitting"
          >
            {{ submitting ? 'Submitting Vote...' : 'Submit Vote' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import keyManager from '@/services/keyManager'
import VoteReceipt from '@/components/VoteReceipt.vue'

export default {
  name: 'VoteView',
  components: {
    VoteReceipt
  },
  data() {
    return {
      electionId: this.$route.params.id,
      selectedCandidate: this.$route.query.candidateId || null,
      submitting: false,
      voteSubmitted: false,
      voteReceipt: null,
      localError: null,
      encryptingVote: false
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
    canSubmitVote() {
      return this.selectedCandidate && keyManager.getCurrentKeys() !== null
    },
    hasKeys() {
      return keyManager.getCurrentKeys() !== null
    }
  },
  methods: {
    selectCandidate(candidateId) {
      this.selectedCandidate = candidateId
    },
    async submitVote() {
      if (!this.canSubmitVote) return
      
      this.submitting = true
      this.encryptingVote = true
      this.localError = null
      
      try {
        // Check if keys are loaded
        if (!keyManager.getCurrentKeys()) {
          throw new Error('Cryptographic keys not loaded. Please login again.')
        }
        
        console.log('Encrypting vote...')
        
        // Generate encrypted vote package with signature
        const votePackage = await keyManager.generateVote(
          { candidateId: this.selectedCandidate },
          this.electionId,
          this.election.public_key || this.election.publicKey // Election's public key for encryption
        )
        
        this.encryptingVote = false
        console.log('Vote encrypted successfully')
        console.log('📤 Sending vote package:', {
          hasEncryptedBallot: !!votePackage.encryptedBallot,
          hasNullifier: !!votePackage.nullifier,
          hasSignature: !!votePackage.signature,
          hasPublicKey: !!votePackage.publicKey,
          hasTimestamp: !!votePackage.timestamp,
          encryptedBallotLength: votePackage.encryptedBallot?.length,
          nullifierLength: votePackage.nullifier?.length,
          signatureLength: votePackage.signature?.length,
          publicKeyLength: votePackage.publicKey?.length
        })
        
        // Submit encrypted vote to backend
        const response = await this.$store.dispatch('castVote', {
          electionId: this.electionId,
          voteData: votePackage
        })
        
        this.voteSubmitted = true
        this.voteReceipt = response.receipt
      } catch (error) {
        this.localError = error.message || error.response?.data?.message || 'Failed to submit vote. Please try again.'
        console.error('Vote submission error:', error)
      } finally {
        this.submitting = false
        this.encryptingVote = false
      }
    },
    formatDate(timestamp) {
      const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }
      return new Date(timestamp).toLocaleDateString(undefined, options)
    }
  },
  async created() {
    await this.$store.dispatch('fetchElection', this.electionId)
    
    // Load user keys if not already loaded
    if (!keyManager.getCurrentKeys() && this.currentUser) {
      try {
        console.log('Loading user keys for voting...')
        // In a real implementation, we'd prompt for password
        // For now, try to load from storage
        if (keyManager.hasStoredKeys(this.currentUser.studentId || this.currentUser.id)) {
          // Keys exist but need password to decrypt - show prompt
          this.localError = 'Please provide your password to load your voting keys.'
        }
      } catch (error) {
        console.error('Failed to load keys:', error)
        this.localError = 'Failed to load cryptographic keys. Please login again.'
      }
    }
  }
}
</script>

<style scoped>
.vote-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.loading, .not-found, .not-active, .vote-success {
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

.success-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background-color: #2ecc71;
  color: white;
  border-radius: 50%;
  font-size: 40px;
  margin-bottom: 20px;
}

.voting-interface h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #2c3e50;
}

.election-info {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.election-info h2 {
  margin-bottom: 10px;
  color: #2c3e50;
}

.election-info p {
  color: #7f8c8d;
  line-height: 1.6;
}

.voting-form {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 30px;
}

.voting-form h3 {
  margin-bottom: 20px;
  color: #2c3e50;
  font-size: 1.3rem;
}

.candidates-list {
  margin-bottom: 30px;
}

.candidate-option {
  display: flex;
  align-items: center;
  padding: 15px;
  border: 2px solid #ecf0f1;
  border-radius: 8px;
  margin-bottom: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.candidate-option:hover {
  border-color: #bdc3c7;
}

.candidate-option.selected {
  border-color: #3498db;
  background-color: #ebf5fb;
}

.selection-indicator {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid #bdc3c7;
  margin-right: 15px;
  position: relative;
}

.candidate-option.selected .selection-indicator {
  border-color: #3498db;
}

.candidate-option.selected .selection-indicator:after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  background-color: #3498db;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.candidate-info {
  flex: 1;
}

.candidate-info h4 {
  margin-bottom: 5px;
  color: #2c3e50;
}

.candidate-info p {
  color: #7f8c8d;
  font-size: 0.9rem;
}

.crypto-status {
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 20px;
}

.form-control {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.form-control:focus {
  border-color: #3498db;
  outline: none;
}

.confirmation-section {
  text-align: center;
}

.alert-success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.alert-warning {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
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

.alert-info {
  background-color: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
  text-align: left;
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

.btn-vote {
  padding: 15px 30px;
  font-size: 1.1rem;
}

.receipt-info {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
  text-align: left;
  width: 100%;
}

.receipt-info h3 {
  margin-bottom: 15px;
  color: #2c3e50;
}

.receipt-item {
  margin-bottom: 10px;
}

.receipt-label {
  font-weight: bold;
  color: #34495e;
  margin-right: 5px;
}

.receipt-value {
  color: #7f8c8d;
  word-break: break-all;
  font-family: monospace;
}

.verification-note {
  color: #7f8c8d;
  margin-bottom: 20px;
  font-style: italic;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-top: 20px;
}
</style>