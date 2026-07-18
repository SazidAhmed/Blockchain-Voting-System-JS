<template>
  <div class="register-container">
    <div class="register-card">
      <h2>Register</h2>

      <!-- Progress Steps -->
      <div class="step-indicator">
        <div class="step" :class="{ active: currentStep >= 1, completed: currentStep > 1 }">
          <span class="step-number">{{ currentStep > 1 ? '✓' : '1' }}</span>
          <span class="step-label">Verify ID</span>
        </div>
        <div class="step-line" :class="{ active: currentStep > 1 }"></div>
        <div class="step" :class="{ active: currentStep >= 2, completed: currentStep > 2 }">
          <span class="step-number">{{ currentStep > 2 ? '✓' : '2' }}</span>
          <span class="step-label">Verify Email</span>
        </div>
        <div class="step-line" :class="{ active: currentStep > 2 }"></div>
        <div class="step" :class="{ active: currentStep >= 3 }">
          <span class="step-number">3</span>
          <span class="step-label">Set Password</span>
        </div>
      </div>

      <div v-if="error || localError" class="alert alert-danger">{{ error || localError }}</div>
      <div v-if="generatingKeys" class="alert alert-info">🔐 Generating cryptographic keys... Please wait.</div>

      <!-- Step 1: Institution ID lookup -->
      <div v-if="currentStep === 1">
        <div class="form-group">
          <label for="studentId">Student / Staff / Teacher ID</label>
          <div class="lookup-row">
            <input
              type="text"
              id="studentId"
              v-model="studentId"
              class="form-control"
              placeholder="e.g. STU00042 or TEACH0003"
              :disabled="memberFound"
              @keyup.enter="lookupMember"
            >
            <button
              type="button"
              class="btn btn-lookup"
              @click="lookupMember"
              :disabled="!studentId || lookingUp || memberFound"
            >
              {{ lookingUp ? '...' : memberFound ? '✓' : 'Verify' }}
            </button>
          </div>
          <p class="hint">Enter your university-issued ID to auto-fill your details.</p>
        </div>

        <div v-if="memberFound">
          <div class="member-info">
            <div class="info-row"><span class="info-label">Full Name</span><span class="info-value">{{ name }}</span></div>
            <div class="info-row"><span class="info-label">Email</span><span class="info-value">{{ email }}</span></div>
            <div class="info-row"><span class="info-label">Role</span><span class="info-value role-badge" :class="'role-' + role">{{ role }}</span></div>
            <div class="info-row"><span class="info-label">Department</span><span class="info-value">{{ department }}</span></div>
          </div>

          <!-- Already registered notice -->
          <div v-if="alreadyRegistered" class="alert alert-warning">
            ✅ You're already registered. Please <router-link to="/login">login</router-link> to your account.
          </div>

          <div v-if="!alreadyRegistered">
            <button type="button" class="btn btn-primary" @click="sendOTP" :disabled="sendingOTP">
              {{ sendingOTP ? 'Sending...' : '📧 Send Verification Code' }}
            </button>
          </div>

          <button type="button" class="btn btn-secondary mt-8" @click="resetLookup">Use a different ID</button>
        </div>
      </div>

      <!-- Step 2: OTP Verification -->
      <div v-if="currentStep === 2">
        <div class="otp-section">
          <div class="otp-header">
            <span class="otp-icon">📧</span>
            <h3>Check Your Email</h3>
            <p>We sent a 6-digit verification code to:</p>
            <p class="masked-email">{{ maskedEmail }}</p>
          </div>

          <div class="form-group">
            <label for="otpCode">Verification Code</label>
            <input
              type="text"
              id="otpCode"
              v-model="otpCode"
              class="form-control otp-input"
              placeholder="Enter 6-digit code"
              maxlength="6"
              autocomplete="one-time-code"
              inputmode="numeric"
              @keyup.enter="verifyOTP"
            >
          </div>

          <button type="button" class="btn btn-primary" @click="verifyOTP" :disabled="!otpValid || verifyingOTP">
            {{ verifyingOTP ? 'Verifying...' : '✓ Verify Code' }}
          </button>

          <div class="otp-footer">
            <p class="hint">Code expires in {{ otpExpiryMinutes }} minutes</p>
            <button type="button" class="btn-link" @click="resendOTP" :disabled="resendCooldown > 0">
              {{ resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code' }}
            </button>
          </div>

          <button type="button" class="btn btn-secondary mt-8" @click="resetLookup">Start Over</button>
        </div>
      </div>

      <!-- Step 3: Password form -->
      <div v-if="currentStep === 3">
        <div class="alert alert-success">✅ Email verified successfully! Now set your password.</div>

        <div class="member-info">
          <div class="info-row"><span class="info-label">Full Name</span><span class="info-value">{{ name }}</span></div>
          <div class="info-row"><span class="info-label">Email</span><span class="info-value">{{ email }}</span></div>
          <div class="info-row"><span class="info-label">Role</span><span class="info-value role-badge" :class="'role-' + role">{{ role }}</span></div>
        </div>

        <form @submit.prevent="handleRegister">
          <div class="form-group">
            <label for="password">Set Password</label>
            <input type="password" id="password" v-model="password" required class="form-control" placeholder="Minimum 8 characters">
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input type="password" id="confirmPassword" v-model="confirmPassword" required class="form-control" placeholder="••••••••">
            <p v-if="confirmPassword && password !== confirmPassword" class="field-error">Passwords do not match</p>
          </div>

          <button type="submit" class="btn btn-primary" :disabled="loading || !formValid">
            {{ loading ? 'Registering...' : 'Complete Registration' }}
          </button>

          <div v-if="error || localError" class="alert alert-danger mt-8">{{ error || localError }}</div>
        </form>
      </div>

      <div class="login-link">
        Already have an account?
        <router-link to="/login">Login</router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import keyManager from '@/services/keyManager'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

export default {
  name: 'RegisterView',
  data() {
    return {
      currentStep: 1,
      studentId: '',
      name: '',
      email: '',
      role: '',
      department: '',
      yearLevel: '',
      password: '',
      confirmPassword: '',
      localError: '',
      generatingKeys: false,
      lookingUp: false,
      memberFound: false,
      alreadyRegistered: false,
      // OTP fields
      otpCode: '',
      maskedEmail: '',
      otpExpiryMinutes: 10,
      sendingOTP: false,
      verifyingOTP: false,
      resendCooldown: 0,
      resendTimer: null
    }
  },
  computed: {
    ...mapGetters(['error', 'isLoading']),
    loading() {
      return this.isLoading || this.generatingKeys
    },
    formValid() {
      return this.password === this.confirmPassword && this.password.length >= 8
    },
    otpValid() {
      return this.otpCode.length === 6 && /^\d{6}$/.test(this.otpCode)
    }
  },
  methods: {
    async lookupMember() {
      if (!this.studentId.trim()) return
      this.lookingUp = true
      this.localError = ''
      this.$store.commit('CLEAR_ERROR')

      try {
        const res = await fetch(`${API_BASE}/api/users/institution-lookup/${this.studentId.trim().toUpperCase()}`)
        const data = await res.json()

        if (!res.ok) {
          this.localError = data.message || 'Institution ID not found.'
          return
        }

        // Check if already registered
        this.alreadyRegistered = !!data.isVoter
        this.name = data.fullName
        this.email = data.email
        this.role = data.role
        this.department = data.department
        this.yearLevel = data.year || ''
        this.memberFound = true
      } catch (err) {
        this.localError = 'Could not reach the institutional directory. Please try again.'
      } finally {
        this.lookingUp = false
      }
    },

    async sendOTP() {
      this.sendingOTP = true
      this.localError = ''

      try {
        const res = await fetch(`${API_BASE}/api/users/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ institutionId: this.studentId.trim().toUpperCase() })
        })
        const data = await res.json()

        if (!res.ok) {
          this.localError = data.message || 'Failed to send verification code.'
          return
        }

        this.maskedEmail = data.maskedEmail
        this.otpExpiryMinutes = data.expiresInMinutes || 10
        this.currentStep = 2
        this.startResendCooldown()
      } catch (err) {
        this.localError = 'Failed to send verification code. Please try again.'
      } finally {
        this.sendingOTP = false
      }
    },

    async verifyOTP() {
      if (!this.otpValid) return
      this.verifyingOTP = true
      this.localError = ''

      try {
        const res = await fetch(`${API_BASE}/api/users/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            institutionId: this.studentId.trim().toUpperCase(),
            code: this.otpCode
          })
        })
        const data = await res.json()

        if (!res.ok) {
          this.localError = data.message || 'Invalid verification code.'
          return
        }

        // OTP verified — proceed to password step
        this.currentStep = 3
        this.localError = ''
      } catch (err) {
        this.localError = 'Verification failed. Please try again.'
      } finally {
        this.verifyingOTP = false
      }
    },

    async resendOTP() {
      if (this.resendCooldown > 0) return
      this.otpCode = ''
      this.localError = ''
      await this.sendOTP()
      // sendOTP already handles moving to step 2 / starting cooldown
    },

    startResendCooldown() {
      this.resendCooldown = 60
      if (this.resendTimer) clearInterval(this.resendTimer)
      this.resendTimer = setInterval(() => {
        this.resendCooldown--
        if (this.resendCooldown <= 0) {
          clearInterval(this.resendTimer)
          this.resendTimer = null
        }
      }, 1000)
    },

    resetLookup() {
      this.currentStep = 1
      this.memberFound = false
      this.alreadyRegistered = false
      this.studentId = ''
      this.name = ''
      this.email = ''
      this.role = ''
      this.department = ''
      this.yearLevel = ''
      this.password = ''
      this.confirmPassword = ''
      this.localError = ''
      this.otpCode = ''
      this.maskedEmail = ''
      this.sendingOTP = false
      this.verifyingOTP = false
      this.resendCooldown = 0
      if (this.resendTimer) {
        clearInterval(this.resendTimer)
        this.resendTimer = null
      }
    },

    async handleRegister() {
      if (this.password !== this.confirmPassword) {
        this.localError = 'Passwords do not match'
        return
      }

      try {
        this.generatingKeys = true
        this.localError = ''

        const { publicKeys } = await keyManager.initializeUserKeys(this.studentId, this.password)

        this.generatingKeys = false

        await this.$store.dispatch('register', {
          institutionId: this.studentId.toUpperCase(),
          password: this.password,
          publicKey: publicKeys.signingPublicKey,
          encryptionPublicKey: publicKeys.encryptionPublicKey
        })

        this.$store.commit('SET_ERROR', null)
        alert('Registration successful! Your cryptographic keys have been generated and stored securely. Please login.')
        this.$router.push('/login')
      } catch (error) {
        console.error('Registration error:', error)
        this.localError = error.response?.data?.message || error.message || 'Registration failed'
        this.generatingKeys = false
      }
    }
  },
  created() {
    this.$store.commit('CLEAR_ERROR')
  },
  beforeUnmount() {
    if (this.resendTimer) {
      clearInterval(this.resendTimer)
    }
  }
}
</script>

<style scoped>
.register-container {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 100px);
  padding: 20px;
}

.register-card {
  width: 100%;
  max-width: 500px;
  padding: 30px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  color: #2c3e50;
}

h2 {
  text-align: center;
  margin-bottom: 10px;
  color: #2c3e50;
}

/* Step Indicator */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
  padding: 0 10px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.step-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  background: #e0e0e0;
  color: #999;
  transition: all 0.3s;
}

.step.active .step-number {
  background: #3498db;
  color: #fff;
}

.step.completed .step-number {
  background: #27ae60;
  color: #fff;
}

.step-label {
  font-size: 0.75rem;
  color: #999;
  font-weight: 500;
}

.step.active .step-label {
  color: #3498db;
  font-weight: 600;
}

.step.completed .step-label {
  color: #27ae60;
}

.step-line {
  flex: 1;
  height: 2px;
  background: #e0e0e0;
  margin: 0 8px;
  margin-bottom: 18px;
  transition: background 0.3s;
}

.step-line.active {
  background: #27ae60;
}

/* OTP Section */
.otp-section {
  text-align: center;
}

.otp-header {
  margin-bottom: 24px;
}

.otp-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 8px;
}

.otp-header h3 {
  margin: 0 0 8px;
  color: #2c3e50;
  font-size: 1.2rem;
}

.otp-header p {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

.masked-email {
  font-weight: 700;
  color: #3498db !important;
  font-size: 1rem !important;
  margin-top: 4px !important;
}

.otp-input {
  text-align: center;
  font-size: 28px !important;
  letter-spacing: 8px;
  font-weight: 700;
  padding: 16px !important;
}

.otp-footer {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-link {
  background: none;
  border: none;
  color: #3498db;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0;
  text-decoration: underline;
}

.btn-link:hover {
  color: #2980b9;
}

.btn-link:disabled {
  color: #999;
  cursor: not-allowed;
  text-decoration: none;
}

.alert-success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
  padding: 12px;
  margin-bottom: 20px;
  border-radius: 4px;
}

/* Existing styles */
.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #2c3e50;
}

.lookup-row {
  display: flex;
  gap: 10px;
}

.lookup-row .form-control {
  flex: 1;
}

.hint {
  margin-top: 6px;
  font-size: 0.82rem;
  color: #888;
}

.member-info {
  background: #f0f7ff;
  border: 1px solid #bee3f8;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 24px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #d1eaf8;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-weight: 600;
  color: #555;
  font-size: 0.9rem;
}

.info-value {
  color: #2c3e50;
  font-size: 0.9rem;
}

.role-badge {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: capitalize;
}

.role-student  { background: #d4edda; color: #155724; }
.role-teacher  { background: #cce5ff; color: #004085; }
.role-staff    { background: #fff3cd; color: #856404; }

.form-control {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  color: #2c3e50;
  box-sizing: border-box;
}

.form-control:focus {
  border-color: #3498db;
  outline: none;
}

.form-control:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.field-error {
  color: #e74c3c;
  font-size: 0.82rem;
  margin-top: 4px;
}

.btn {
  display: block;
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
  text-align: center;
}

.btn-primary {
  background-color: #3498db;
  color: white;
}

.btn-primary:hover { background-color: #2980b9; }
.btn-primary:disabled { background-color: #95a5a6; cursor: not-allowed; }

.btn-secondary {
  background-color: #ecf0f1;
  color: #2c3e50;
  margin-top: 10px;
}

.btn-secondary:hover { background-color: #bdc3c7; }

.btn-lookup {
  width: auto;
  padding: 12px 20px;
  background-color: #27ae60;
  color: white;
  flex-shrink: 0;
}

.btn-lookup:hover { background-color: #219a52; }
.btn-lookup:disabled { background-color: #95a5a6; cursor: not-allowed; }

.mt-8 { margin-top: 8px; }

.login-link {
  margin-top: 20px;
  text-align: center;
  color: #7f8c8d;
}

.login-link a {
  color: #3498db;
  text-decoration: none;
}

.login-link a:hover { text-decoration: underline; }

.alert {
  padding: 12px;
  margin-bottom: 20px;
  border-radius: 4px;
}

.alert-danger {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.alert-warning {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffc107;
  border-radius: 4px;
}

.alert-warning a {
  color: #856404;
  font-weight: 600;
}

.alert-info {
  background-color: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}
</style>