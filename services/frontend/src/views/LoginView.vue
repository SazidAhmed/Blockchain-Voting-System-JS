<template>
  <div class="page-centered">
    <div class="login-card glass">
      <div class="login-header">
        <PhShieldCheck :size="36" weight="fill" color="var(--accent)" />
        <h1>CryptoPoll</h1>
        <p class="login-subtitle">Sign in to your account</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label class="form-label" for="studentId">Student / Staff ID</label>
          <div class="input-with-icon">
            <PhUser :size="18" class="input-icon" />
            <input
              type="text"
              id="studentId"
              v-model="studentId"
              required
              class="form-input"
              placeholder="e.g. CRYPTO2025"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="password">Password</label>
          <div class="input-with-icon">
            <PhLock :size="18" class="input-icon" />
            <input
              type="password"
              id="password"
              v-model="password"
              required
              class="form-input"
              placeholder="Enter your password"
            />
          </div>
        </div>

        <button
          type="submit"
          class="btn btn-primary btn-block"
          :disabled="loading"
        >
          <PhSpinner v-if="loading" :size="18" class="spinning" />
          <PhSignIn v-else :size="18" />
          {{ loading ? "Signing in..." : "Sign In" }}
        </button>
      </form>

      <div class="login-footer">
        Don't have an account?
        <router-link to="/register">Register</router-link>
      </div>
    </div>

    <AppModal
      :show="showErrorModal"
      type="error"
      title="Login Failed"
      :message="errorMessage"
      @confirm="showErrorModal = false"
    />
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import {
  PhShieldCheck,
  PhUser,
  PhLock,
  PhSignIn,
  PhSpinner,
} from "@phosphor-icons/vue";
import AppModal from "@/components/AppModal.vue";

export default {
  name: "LoginView",
  components: { PhShieldCheck, PhUser, PhLock, PhSignIn, PhSpinner, AppModal },
  data() {
    return {
      studentId: "",
      password: "",
      showErrorModal: false,
      errorMessage: "",
    };
  },
  computed: {
    ...mapGetters(["error", "isLoading"]),
    loading() {
      return this.isLoading;
    },
  },
  methods: {
    async handleLogin() {
      try {
        const loginResponse = await this.$store.dispatch("login", {
          institutionId: this.studentId,
          password: this.password,
        });
        const redirectPath = this.$route.query.redirect || "/elections";
        this.$router.push(redirectPath);
      } catch (error) {
        this.errorMessage =
          error.displayMessage ||
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Invalid credentials. Please check your ID and password.";
        this.showErrorModal = true;
      }
    },
  },
  created() {
    this.$store.commit("CLEAR_ERROR");
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

.login-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.login-footer a {
  font-weight: 600;
}
</style>
