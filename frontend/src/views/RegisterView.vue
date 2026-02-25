<template>
  <div class="register-container">
    <div class="register-card">
      <h2>Register</h2>

      <div v-if="error || localError" class="alert alert-danger">{{ error || localError }}</div>
      <div v-if="generatingKeys" class="alert alert-info">🔐 Generating cryptographic keys... Please wait.</div>

      <!-- Step 1: Institution ID lookup -->
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

      <!-- Step 2: Show auto-filled info + password -->
      <form v-if="memberFound" @submit.prevent="handleRegister">
        <div class="member-info">
          <div class="info-row"><span class="info-label">Full Name</span><span class="info-value">{{ name }}</span></div>
          <div class="info-row"><span class="info-label">Email</span><span class="info-value">{{ email }}</span></div>
          <div class="info-row"><span class="info-label">Role</span><span class="info-value role-badge" :class="'role-' + role">{{ role }}</span></div>
          <div class="info-row"><span class="info-label">Department</span><span class="info-value">{{ department }}</span></div>
        </div>

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

        <button type="button" class="btn btn-secondary mt-8" @click="resetLookup">Use a different ID</button>
      </form>

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

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

export default {
  name: 'RegisterView',
  data() {
    return {
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
      memberFound: false
    }
  },
  computed: {
    ...mapGetters(['error', 'isLoading']),
    loading() {
      return this.isLoading || this.generatingKeys
    },
    formValid() {
      return this.password === this.confirmPassword && this.password.length >= 8
    }
  },
  methods: {
    async lookupMember() {
      if (!this.studentId.trim()) return
      this.lookingUp = true
      this.localError = ''
      this.$store.commit('CLEAR_ERROR')

      try {
        const res = await fetch(`${API_BASE}/users/institution-lookup/${this.studentId.trim().toUpperCase()}`)
        const data = await res.json()

        if (!res.ok) {
          this.localError = data.message || 'Institution ID not found.'
          return
        }

        // Check if already registered
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

    resetLookup() {
      this.memberFound = false
      this.studentId = ''
      this.name = ''
      this.email = ''
      this.role = ''
      this.department = ''
      this.password = ''
      this.confirmPassword = ''
      this.localError = ''
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
        alert('Registration successful! Your cryptographic keys have been generated and stored securely.')
        this.$router.push('/elections')
      } catch (error) {
        console.error('Registration error:', error)
        this.localError = error.message || 'Registration failed'
        this.generatingKeys = false
      }
    }
  },
  created() {
    this.$store.commit('CLEAR_ERROR')
  }
}
</script>

<style scoped>
.register-container {
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
  margin-bottom: 30px;
  color: #2c3e50;
}

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

.alert-info {
  background-color: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}
</style>