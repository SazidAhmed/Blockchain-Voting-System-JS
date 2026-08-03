<template>
  <div class="page-centered">
    <div class="register-card glass">
      <div class="register-header">
        <PhShieldCheck :size="36" weight="fill" color="var(--accent)" />
        <h1>CryptoPoll</h1>
        <p class="register-subtitle">Create your account</p>
      </div>

      <!-- Progress Steps -->
      <div class="step-indicator">
        <div
          class="step"
          :class="{ active: currentStep >= 1, completed: currentStep > 1 }"
        >
          <div class="step-number">
            <PhChecks v-if="currentStep > 1" :size="16" weight="fill" />
            <span v-else>1</span>
          </div>
          <span class="step-label">Verify ID</span>
        </div>
        <div class="step-line" :class="{ active: currentStep > 1 }"></div>
        <div
          class="step"
          :class="{ active: currentStep >= 2, completed: currentStep > 2 }"
        >
          <div class="step-number">
            <PhChecks v-if="currentStep > 2" :size="16" weight="fill" />
            <span v-else>2</span>
          </div>
          <span class="step-label">Verify Email</span>
        </div>
        <div class="step-line" :class="{ active: currentStep > 2 }"></div>
        <div class="step" :class="{ active: currentStep >= 3 }">
          <div class="step-number">3</div>
          <span class="step-label">Set Password</span>
        </div>
      </div>

      <div v-if="error || localError" class="alert alert-danger">
        {{ error || localError }}
      </div>
      <div v-if="generatingKeys" class="alert alert-info">
        <PhSpinner :size="16" class="spinning" /> Generating cryptographic
        keys... Please wait.
      </div>

      <!-- Step 1: Institution ID lookup -->
      <div v-if="currentStep === 1">
        <div class="form-group">
          <label class="form-label" for="studentId"
            >Student / Staff / Teacher ID</label
          >
          <div class="lookup-row">
            <div class="input-with-icon" style="flex: 1">
              <PhIdentificationBadge :size="18" class="input-icon" />
              <input
                type="text"
                id="studentId"
                v-model="studentId"
                class="form-input"
                placeholder="e.g. STU00042 or TEACH0003"
                :disabled="memberFound"
                @keyup.enter="lookupMember"
              />
            </div>
            <button
              type="button"
              class="btn btn-lookup"
              @click="lookupMember"
              :disabled="!studentId || lookingUp || memberFound"
            >
              <PhChecks v-if="memberFound" :size="18" weight="fill" />
              <PhSpinner v-else-if="lookingUp" :size="18" class="spinning" />
              <PhMagnifyingGlass v-else :size="18" />
              {{ lookingUp ? "..." : memberFound ? "Verified" : "Verify" }}
            </button>
          </div>
          <p class="hint">
            Enter your university-issued ID to auto-fill your details.
          </p>
        </div>

        <div v-if="memberFound">
          <div class="member-info">
            <div class="info-row">
              <span class="info-label">Full Name</span
              ><span class="info-value">{{ name }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email</span
              ><span class="info-value">{{ email }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Role</span
              ><span class="info-value role-badge" :class="'role-' + role">{{
                role
              }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Department</span
              ><span class="info-value">{{ department }}</span>
            </div>
          </div>

          <div v-if="alreadyRegistered" class="alert alert-warning">
            You're already registered. Please
            <router-link to="/login">login</router-link> to your account.
          </div>

          <div v-if="!alreadyRegistered">
            <button
              type="button"
              class="btn btn-primary btn-block"
              @click="sendOTP"
              :disabled="sendingOTP"
            >
              <PhEnvelope v-if="!sendingOTP" :size="18" />
              <PhSpinner v-else :size="18" class="spinning" />
              {{ sendingOTP ? "Sending..." : "Send Verification Code" }}
            </button>
          </div>

          <button
            type="button"
            class="btn btn-secondary mt-8"
            @click="resetLookup"
          >
            Use a different ID
          </button>
        </div>
      </div>

      <!-- Step 2: OTP Verification -->
      <div v-if="currentStep === 2">
        <div class="otp-section">
          <div class="otp-header">
            <PhEnvelope
              :size="48"
              weight="fill"
              color="var(--accent)"
              class="otp-icon"
            />
            <h3>Check Your Email</h3>
            <p>We sent a 6-digit verification code to:</p>
            <p class="masked-email">{{ maskedEmail }}</p>
          </div>

          <div class="form-group">
            <label class="form-label" for="otpCode">Verification Code</label>
            <input
              type="text"
              id="otpCode"
              v-model="otpCode"
              class="form-input otp-input"
              placeholder="Enter 6-digit code"
              maxlength="6"
              autocomplete="one-time-code"
              inputmode="numeric"
              @keyup.enter="verifyOTP"
            />
          </div>

          <button
            type="button"
            class="btn btn-primary"
            @click="verifyOTP"
            :disabled="!otpValid || verifyingOTP"
          >
            <PhChecks v-if="!verifyingOTP" :size="18" />
            <PhSpinner v-else :size="18" class="spinning" />
            {{ verifyingOTP ? "Verifying..." : "Verify Code" }}
          </button>

          <div class="otp-footer">
            <p class="hint">Code expires in {{ otpExpiryMinutes }} minutes</p>
            <button
              type="button"
              class="btn-link"
              @click="resendOTP"
              :disabled="resendCooldown > 0"
            >
              {{
                resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : "Resend Code"
              }}
            </button>
          </div>

          <button
            type="button"
            class="btn btn-secondary mt-8"
            @click="resetLookup"
          >
            Start Over
          </button>
        </div>
      </div>

      <!-- Step 3: Password form -->
      <div v-if="currentStep === 3">
        <div class="alert alert-success">
          <PhChecks :size="16" weight="fill" /> Email verified successfully! Now
          set your password.
        </div>

        <div class="member-info">
          <div class="info-row">
            <span class="info-label">Full Name</span
            ><span class="info-value">{{ name }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Email</span
            ><span class="info-value">{{ email }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Role</span
            ><span class="info-value role-badge" :class="'role-' + role">{{
              role
            }}</span>
          </div>
        </div>

        <form @submit.prevent="handleRegister">
          <div class="form-group">
            <label class="form-label" for="password">Set Password</label>
            <div class="input-with-icon">
              <PhLock :size="18" class="input-icon" />
              <input
                type="password"
                id="password"
                v-model="password"
                required
                class="form-input"
                placeholder="Minimum 8 characters"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="confirmPassword"
              >Confirm Password</label
            >
            <div class="input-with-icon">
              <PhLockKey :size="18" class="input-icon" />
              <input
                type="password"
                id="confirmPassword"
                v-model="confirmPassword"
                required
                class="form-input"
                placeholder="••••••••"
              />
            </div>
            <p
              v-if="confirmPassword && password !== confirmPassword"
              class="field-error"
            >
              Passwords do not match
            </p>
          </div>

          <button
            type="submit"
            class="btn btn-primary"
            :disabled="loading || !formValid"
          >
            <PhSpinner v-if="loading" :size="18" class="spinning" />
            {{ loading ? "Registering..." : "Complete Registration" }}
          </button>

          <div v-if="error || localError" class="alert alert-danger mt-8">
            {{ error || localError }}
          </div>
        </form>
      </div>

      <div class="login-link">
        Already have an account?
        <router-link to="/login">Login</router-link>
      </div>
    </div>

    <AppModal
      :show="showSuccessModal"
      type="success"
      title="Registration Successful"
      message="Your cryptographic keys have been generated and stored securely. Please login."
      @confirm="goToLogin"
    />
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import api from "@/services/api";
import keyManager from "@/services/keyManager";
import {
  PhShieldCheck,
  PhUser,
  PhLock,
  PhLockKey,
  PhSignIn,
  PhSpinner,
  PhChecks,
  PhIdentificationBadge,
  PhMagnifyingGlass,
  PhEnvelope,
} from "@phosphor-icons/vue";
import AppModal from "@/components/AppModal.vue";

export default {
  name: "RegisterView",
  components: {
    PhShieldCheck,
    PhUser,
    PhLock,
    PhLockKey,
    PhSignIn,
    PhSpinner,
    PhChecks,
    PhIdentificationBadge,
    PhMagnifyingGlass,
    PhEnvelope,
    AppModal,
  },
  data() {
    return {
      currentStep: 1,
      studentId: "",
      name: "",
      email: "",
      role: "",
      department: "",
      yearLevel: "",
      password: "",
      confirmPassword: "",
      localError: "",
      generatingKeys: false,
      lookingUp: false,
      memberFound: false,
      alreadyRegistered: false,
      showSuccessModal: false,
      otpCode: "",
      maskedEmail: "",
      otpExpiryMinutes: 10,
      sendingOTP: false,
      verifyingOTP: false,
      resendCooldown: 0,
      resendTimer: null,
    };
  },
  computed: {
    ...mapGetters(["error", "isLoading"]),
    loading() {
      return this.isLoading || this.generatingKeys;
    },
    formValid() {
      return (
        this.password === this.confirmPassword && this.password.length >= 8
      );
    },
    otpValid() {
      return this.otpCode.length === 6 && /^\d{6}$/.test(this.otpCode);
    },
  },
  methods: {
    async lookupMember() {
      if (!this.studentId.trim()) return;
      this.lookingUp = true;
      this.localError = "";
      this.$store.commit("CLEAR_ERROR");

      try {
        const { data, status } = await api.get(
          `/users/institution-lookup/${this.studentId.trim().toUpperCase()}`,
        );
        // api throws on non-2xx, but 404 returns data with message
        if (data.message && !data.fullName) {
          this.localError = data.message || "Institution ID not found.";
          return;
        }

        this.alreadyRegistered = !!data.isVoter;
        this.name = data.fullName;
        this.email = data.email;
        this.role = data.role;
        this.department = data.department;
        this.yearLevel = data.year || "";
        this.memberFound = true;
      } catch (err) {
        this.localError =
          err.displayMessage ||
          err.response?.data?.message ||
          "Could not reach the institutional directory. Please try again.";
      } finally {
        this.lookingUp = false;
      }
    },

    async sendOTP() {
      this.sendingOTP = true;
      this.localError = "";

      try {
        const { data } = await api.post("/users/send-otp", {
          institutionId: this.studentId.trim().toUpperCase(),
        });

        this.maskedEmail = data.maskedEmail;
        this.otpExpiryMinutes = data.expiresInMinutes || 10;
        this.currentStep = 2;
        this.startResendCooldown();
      } catch (err) {
        this.localError =
          err.displayMessage ||
          err.response?.data?.message ||
          "Failed to send verification code. Please try again.";
      } finally {
        this.sendingOTP = false;
      }
    },

    async verifyOTP() {
      if (!this.otpValid) return;
      this.verifyingOTP = true;
      this.localError = "";

      try {
        await api.post("/users/verify-otp", {
          institutionId: this.studentId.trim().toUpperCase(),
          code: this.otpCode,
        });

        this.currentStep = 3;
        this.localError = "";
      } catch (err) {
        this.localError =
          err.displayMessage ||
          err.response?.data?.message ||
          "Verification failed. Please try again.";
      } finally {
        this.verifyingOTP = false;
      }
    },

    async resendOTP() {
      if (this.resendCooldown > 0) return;
      this.otpCode = "";
      this.localError = "";
      await this.sendOTP();
    },

    startResendCooldown() {
      this.resendCooldown = 60;
      if (this.resendTimer) clearInterval(this.resendTimer);
      this.resendTimer = setInterval(() => {
        this.resendCooldown--;
        if (this.resendCooldown <= 0) {
          clearInterval(this.resendTimer);
          this.resendTimer = null;
        }
      }, 1000);
    },

    resetLookup() {
      this.currentStep = 1;
      this.memberFound = false;
      this.alreadyRegistered = false;
      this.studentId = "";
      this.name = "";
      this.email = "";
      this.role = "";
      this.department = "";
      this.yearLevel = "";
      this.password = "";
      this.confirmPassword = "";
      this.localError = "";
      this.otpCode = "";
      this.maskedEmail = "";
      this.sendingOTP = false;
      this.verifyingOTP = false;
      this.resendCooldown = 0;
      if (this.resendTimer) {
        clearInterval(this.resendTimer);
        this.resendTimer = null;
      }
    },

    goToLogin() {
      this.showSuccessModal = false;
      this.$router.push("/login");
    },

    async handleRegister() {
      if (this.password !== this.confirmPassword) {
        this.localError = "Passwords do not match";
        return;
      }

      try {
        this.generatingKeys = true;
        this.localError = "";

        const { publicKeys } = await keyManager.initializeUserKeys(
          this.studentId.toUpperCase(),
          this.password,
        );

        this.generatingKeys = false;

        await this.$store.dispatch("register", {
          institutionId: this.studentId.toUpperCase(),
          password: this.password,
          publicKey: publicKeys.signingPublicKey,
          encryptionPublicKey: publicKeys.encryptionPublicKey,
        });

        this.$store.commit("SET_ERROR", null);
        this.showSuccessModal = true;
      } catch (error) {
        console.error("Registration error:", error);
        this.localError =
          error.displayMessage ||
          error.response?.data?.message ||
          error.message ||
          "Registration failed. Please try again.";
        this.generatingKeys = false;
      }
    },
  },
  created() {
    this.$store.commit("CLEAR_ERROR");
  },
  beforeUnmount() {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
  },
};
</script>

<style scoped>
.register-card {
  width: 100%;
  max-width: 500px;
  padding: 40px 32px 32px;
  border-radius: var(--radius-xl);
}

.register-header {
  text-align: center;
  margin-bottom: 24px;
}

.register-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 12px;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.register-subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-top: 4px;
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
  background: var(--bg-secondary);
  color: var(--text-muted);
  transition: all 0.3s;
}

.step.active .step-number {
  background: var(--accent);
  color: #fff;
}

.step.completed .step-number {
  background: var(--success);
  color: #fff;
}

.step-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 500;
}

.step.active .step-label {
  color: var(--accent);
  font-weight: 600;
}

.step.completed .step-label {
  color: var(--success);
}

.step-line {
  flex: 1;
  height: 2px;
  background: var(--bg-secondary);
  margin: 0 8px;
  margin-bottom: 18px;
  transition: background 0.3s;
}

.step-line.active {
  background: var(--success);
}

/* OTP Section */
.otp-section {
  text-align: center;
}

.otp-header {
  margin-bottom: 24px;
}

.otp-icon {
  display: block;
  margin: 0 auto 8px;
}

.otp-header h3 {
  margin: 0 0 8px;
  color: var(--text-primary);
  font-size: 1.2rem;
}

.otp-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.masked-email {
  font-weight: 700;
  color: var(--accent) !important;
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
  color: var(--accent);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0;
  text-decoration: underline;
  font-family: var(--font-sans);
}

.btn-link:hover {
  color: color-mix(in srgb, var(--accent) 80%, white);
}

.btn-link:disabled {
  color: var(--text-muted);
  cursor: not-allowed;
  text-decoration: none;
}

.alert-success {
  background: color-mix(in srgb, var(--success) 15%, transparent);
  color: var(--success);
  border: 1px solid color-mix(in srgb, var(--success) 30%, transparent);
  padding: 12px;
  margin-bottom: 20px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
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

.hint {
  margin-top: 6px;
  font-size: 0.82rem;
  color: var(--text-muted);
}

.member-info {
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
  border-radius: var(--radius-md);
  padding: 16px;
  margin-bottom: 24px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.info-value {
  color: var(--text-primary);
  font-size: 0.9rem;
}

.role-badge {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: capitalize;
}

.role-student {
  background: color-mix(in srgb, var(--success) 15%, transparent);
  color: var(--success);
}
.role-teacher {
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent);
}
.role-staff {
  background: color-mix(in srgb, var(--warning) 15%, transparent);
  color: var(--warning);
}

.lookup-row {
  display: flex;
  gap: 10px;
}

.btn-lookup {
  width: auto;
  padding: 10px 20px;
  background: var(--success);
  color: white;
  flex-shrink: 0;
}

.btn-lookup:hover:not(:disabled) {
  background: color-mix(in srgb, var(--success) 85%, black);
}

.btn-lookup:disabled {
  background: var(--bg-secondary);
  color: var(--text-muted);
  cursor: not-allowed;
}

.field-error {
  color: var(--error);
  font-size: 0.82rem;
  margin-top: 4px;
}

.spinning {
  animation: spin 0.7s linear infinite;
}

.mt-8 {
  margin-top: 8px;
}

.login-link {
  margin-top: 20px;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.login-link a {
  font-weight: 600;
}

.alert {
  padding: 12px;
  margin-bottom: 20px;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
}

.alert-danger {
  background: color-mix(in srgb, var(--error) 10%, transparent);
  color: var(--error);
  border: 1px solid color-mix(in srgb, var(--error) 25%, transparent);
}

.alert-warning {
  background: color-mix(in srgb, var(--warning) 10%, transparent);
  color: var(--warning);
  border: 1px solid color-mix(in srgb, var(--warning) 25%, transparent);
  border-radius: var(--radius-md);
}

.alert-warning a {
  color: var(--warning);
  font-weight: 600;
}

.alert-info {
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
