<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>🔐 Admin Panel Login</h1>
        <p>Enter your admin credentials</p>
      </div>

      <div v-if="error" class="alert alert-danger">
        <span class="alert-icon">&#9888;</span>
        <span class="alert-text">{{ error }}</span>
      </div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">Username</label>
          <input
            v-model="username"
            type="text"
            id="username"
            class="form-control"
            placeholder="admin"
            required
          />
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
          />
        </div>

        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ loading ? "Logging in..." : "Login" }}
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../store/auth";

export default {
  name: "LoginView",
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();

    const username = ref("");
    const password = ref("");

    const error = computed(() => authStore.error);
    const loading = computed(() => authStore.loading);

    const handleLogin = async () => {
      try {
        await authStore.login({
          institutionId: username.value,
          password: password.value,
        });
        await router.push("/dashboard");
      } catch (err) {
        console.error("Login error:", err);
      }
    };

    onMounted(() => {
      authStore.clearError();
    });

    return {
      username,
      password,
      error,
      loading,
      handleLogin,
    };
  },
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: var(--accent-gradient);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 450px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  padding: 40px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h1 {
  margin: 0 0 10px 0;
  color: var(--text-primary);
  font-size: 1.8rem;
}

.login-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--text-primary);
}

.form-control {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 1rem;
  font-family: inherit;
  background: var(--bg-card);
  color: var(--text-primary);
  transition: border-color 0.3s ease;
}

.form-control:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
}

.btn {
  display: block;
  width: 100%;
  padding: 12px;
  background: var(--accent-gradient);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 25px;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 30%, transparent);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.alert {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  margin-bottom: 20px;
  border-radius: var(--radius-sm);
  border-left: 4px solid;
  animation: alertSlideIn 0.3s ease;
}

@keyframes alertSlideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.alert-icon {
  font-size: 1.2rem;
  line-height: 1;
  flex-shrink: 0;
}

.alert-text {
  line-height: 1.5;
}

.alert-danger {
  background-color: color-mix(in srgb, var(--error) 10%, transparent);
  color: var(--error);
  border-left-color: var(--error);
}
</style>
