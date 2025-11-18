<template>
  <div class="login-container">
    <div class="login-card">
      <h2>Login</h2>
      <div v-if="error" class="alert alert-danger">{{ error }}</div>
      
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="studentId">Student/Staff ID</label>
          <input 
            type="text" 
            id="studentId" 
            v-model="studentId" 
            required 
            class="form-control"
            placeholder="CRYPTO2025"
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
        
        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>
      </form>
      
      <div class="register-link">
        Don't have an account? 
        <router-link to="/register">Register</router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'LoginView',
  data() {
    return {
      studentId: 'TEST2025001', // Default for testing
      password: 'TestPass123!'  // Default for testing
    }
  },
  computed: {
    ...mapGetters(['error', 'isLoading']),
    loading() {
      return this.isLoading
    }
  },
  methods: {
    async handleLogin() {
      try {
        const loginResponse = await this.$store.dispatch('login', {
          institutionId: this.studentId, // Backend expects institutionId
          password: this.password
        })
        
        // Check if user is admin and redirect to admin dashboard
        if (loginResponse.user && loginResponse.user.role === 'admin') {
          this.$router.push('/admin/dashboard')
        } else {
          // Redirect to elections page or to the page user was trying to access
          const redirectPath = this.$route.query.redirect || '/elections'
          this.$router.push(redirectPath)
        }
      } catch (error) {
        // Error is handled in the store
        console.error('Login error:', error)
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
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 100px);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
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

.register-link {
  margin-top: 20px;
  text-align: center;
  color: #7f8c8d;
}

.register-link a {
  color: #3498db;
  text-decoration: none;
}

.register-link a:hover {
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