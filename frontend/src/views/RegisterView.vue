<template>
  <div class="register-container">
    <div class="register-card">
      <h2>Register</h2>
      <div v-if="error || localError" class="alert alert-danger">{{ error || localError }}</div>
      <div v-if="generatingKeys" class="alert alert-info">
        🔐 Generating cryptographic keys... Please wait.
      </div>
      
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="name">Full Name</label>
          <input 
            type="text" 
            id="name" 
            v-model="name" 
            required 
            class="form-control"
            placeholder="John Doe"
          >
        </div>
        
        <div class="form-group">
          <label for="email">University Email</label>
          <input 
            type="email" 
            id="email" 
            v-model="email" 
            required 
            class="form-control"
            placeholder="student.id@university.edu"
          >
        </div>
        
        <div class="form-group">
          <label for="studentId">Student/Staff ID</label>
          <input 
            type="text" 
            id="studentId" 
            v-model="studentId" 
            required 
            class="form-control"
            placeholder="S12345678"
          >
        </div>
        
        <div class="form-group">
          <label for="password">Password</label>
          <input 
            type="password" 
            id="password" 
            v-model="password" 
            required 
            class="form-control"
            placeholder="••••••••"
          >
        </div>
        
        <div class="form-group">
          <label for="confirmPassword">Confirm Password</label>
          <input 
            type="password" 
            id="confirmPassword" 
            v-model="confirmPassword" 
            required 
            class="form-control"
            placeholder="••••••••"
          >
        </div>
        
        <button type="submit" class="btn btn-primary" :disabled="loading || !formValid">
          {{ loading ? 'Registering...' : 'Register' }}
        </button>
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

export default {
  name: 'RegisterView',
  data() {
    return {
      name: '',
      email: '',
      studentId: '',
      password: '',
      confirmPassword: '',
      localError: '',
      generatingKeys: false,
      keysGenerated: false,
      publicKeys: null
    }
  },
  computed: {
    ...mapGetters(['error', 'isLoading']),
    loading() {
      return this.isLoading || this.generatingKeys
    },
    formValid() {
      return this.password === this.confirmPassword && 
             this.password.length >= 8 &&
             this.email.includes('@') &&
             this.name.length > 0 &&
             this.studentId.length > 0
    }
  },
  methods: {
    async handleRegister() {
      if (this.password !== this.confirmPassword) {
        this.$store.commit('SET_ERROR', 'Passwords do not match')
        return
      }
      
      try {
        // Step 1: Generate cryptographic keypairs
        this.generatingKeys = true
        this.localError = ''
        
        console.log('Generating cryptographic keys...')
        
        const { publicKeys } = await keyManager.initializeUserKeys(
          this.studentId, // Use studentId as user identifier
          this.password
        )
        
        this.publicKeys = publicKeys
        this.keysGenerated = true
        
        console.log('Keys generated successfully')
        
        // Step 2: Register with backend (including public keys)
        this.generatingKeys = false
        
        await this.$store.dispatch('register', {
          institutionId: this.studentId, // Backend expects institutionId
          username: this.name, // Backend expects username
          email: this.email,
          password: this.password,
          role: 'student', // Default role
          publicKey: publicKeys.signingPublicKey, // For voting signatures
          encryptionPublicKey: publicKeys.encryptionPublicKey // For encrypted communication
        })
        
        console.log('Registration successful')
        
        // Show success message with key backup instructions
        this.$store.commit('SET_ERROR', null)
        alert('Registration successful! Your cryptographic keys have been generated and stored securely. Please backup your keys from your profile.')
        
        // Redirect to elections page
        this.$router.push('/elections')
      } catch (error) {
        // Error is handled in the store
        console.error('Registration error:', error)
        this.localError = error.message || 'Registration failed'
        this.generatingKeys = false
      }
    }
  },
  created() {
    // Clear any previous errors
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

.btn {
  display: block;
  width: 100%;
  padding: 12px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn:hover {
  background-color: #2980b9;
}

.btn:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.login-link {
  margin-top: 20px;
  text-align: center;
  color: #7f8c8d;
}

.login-link a {
  color: #3498db;
  text-decoration: none;
}

.login-link a:hover {
  text-decoration: underline;
}

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
</style>