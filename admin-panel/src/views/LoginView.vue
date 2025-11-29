<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>🔐 Admin Panel Login</h1>
        <p>Enter your admin credentials</p>
      </div>

      <div v-if="error" class="alert alert-danger">{{ error }}</div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">Username</label>
          <input
            v-model="username"
            type="text"
            id="username"
            class="form-control"
            placeholder="e.g., ADMIN001"
            required
          >
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            v-model="password"
            type="password"
            id="password"
            class="form-control"
            placeholder="••••••••"
            required
          >
        </div>

        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>
      </form>

      <div class="demo-credentials">
        <p><strong>Demo Credentials:</strong></p>
        <small>Username: ADMIN001</small><br>
        <small>Password: admin123</small>
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
      username: 'ADMIN001',
      password: 'admin123'
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
        await this.$store.dispatch('login', {
          institutionId: this.username,
          password: this.password
        })
        this.$router.push('/dashboard')
      } catch (error) {
        console.error('Login error:', error)
      }
    }
  },
  created() {
    this.$store.commit('CLEAR_ERROR')
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 450px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  padding: 40px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h1 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 1.8rem;
}

.login-header p {
  margin: 0;
  color: #7f8c8d;
  font-size: 0.95rem;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #2c3e50;
}

.form-control {
  width: 100%;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.3s ease;
}

.form-control:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.btn {
  display: block;
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 25px;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.alert {
  padding: 12px;
  margin-bottom: 20px;
  border-radius: 6px;
  border-left: 4px solid;
}

.alert-danger {
  background-color: #f8d7da;
  color: #721c24;
  border-left-color: #dc3545;
}

.demo-credentials {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
  text-align: center;
  color: #7f8c8d;
  font-size: 0.9rem;
}

.demo-credentials p {
  margin: 0 0 8px 0;
  font-weight: 600;
  color: #2c3e50;
}

.demo-credentials small {
  display: block;
  margin: 4px 0;
}
</style>
