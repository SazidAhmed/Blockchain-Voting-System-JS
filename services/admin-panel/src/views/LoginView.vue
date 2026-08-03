<template>
  <div class="page-centered">
    <div class="login-card glass">
      <div class="login-header">
        <PhShieldCheck :size="36" weight="fill" color="var(--accent)" />
        <h1>Admin Panel</h1>
        <p class="login-subtitle">Sign in with your admin credentials</p>
      </div>

      <div v-if="error" class="alert alert-danger">
        <PhWarning :size="16" weight="fill" />
        <span>{{ error }}</span>
      </div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label" for="username">Username</label>
          <div class="input-with-icon">
            <PhUser :size="18" class="input-icon" />
            <input
              v-model="username"
              type="text"
              id="username"
              class="form-input"
              placeholder="admin"
              required
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="password">Password</label>
          <div class="input-with-icon">
            <PhLock :size="18" class="input-icon" />
            <input
              v-model="password"
              type="password"
              id="password"
              class="form-input"
              placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
              required
            />
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          <PhSpinner v-if="loading" :size="18" class="spinning" />
          <PhSignIn v-else :size="18" />
          {{ loading ? "Signing in..." : "Sign In" }}
        </button>
      </form>

      <div class="login-theme-toggle">
        <button
          class="theme-btn"
          @click="toggleTheme"
          :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          <PhSun v-if="isDark" :size="18" />
          <PhMoon v-else :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../store/auth";
import {
  PhShieldCheck,
  PhUser,
  PhLock,
  PhSignIn,
  PhSpinner,
  PhWarning,
  PhSun,
  PhMoon,
} from "@phosphor-icons/vue";

export default {
  name: "LoginView",
  components: {
    PhShieldCheck,
    PhUser,
    PhLock,
    PhSignIn,
    PhSpinner,
    PhWarning,
    PhSun,
    PhMoon,
  },
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();

    const username = ref("");
    const password = ref("");
    const isDark = ref(false);

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

    const toggleTheme = () => {
      isDark.value = !isDark.value;
      document.documentElement.setAttribute(
        "data-theme",
        isDark.value ? "dark" : "light",
      );
      localStorage.setItem("theme", isDark.value ? "dark" : "light");
    };

    onMounted(() => {
      authStore.clearError();
      isDark.value =
        document.documentElement.getAttribute("data-theme") === "dark";
    });

    return {
      username,
      password,
      error,
      loading,
      isDark,
      handleLogin,
      toggleTheme,
    };
  },
};
</script>

<style scoped>
.login-card {
  width: 100%;
  max-width: 400px;
  padding: 40px 32px 32px;
  border-radius: var(--radius-xl);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 12px;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.login-subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

.input-with-icon {
  position: relative;
}

.input-with-icon .input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.input-with-icon .form-input {
  padding-left: 40px;
}

.btn-block {
  width: 100%;
  margin-top: 8px;
}

.spinning {
  animation: spin 0.7s linear infinite;
}

.alert {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  margin-bottom: 20px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
}

.alert-danger {
  background: color-mix(in srgb, var(--error) 10%, transparent);
  color: var(--error);
  border-color: color-mix(in srgb, var(--error) 25%, transparent);
}

.login-theme-toggle {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.theme-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.4rem;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.theme-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
</style>
