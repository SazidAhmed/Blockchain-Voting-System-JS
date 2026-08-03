<template>
  <div class="page">
    <div class="hero">
      <div class="hero-badge glass">
        <PhShieldCheck :size="14" weight="fill" color="var(--accent)" />
        <span>Secure Blockchain Voting</span>
      </div>
      <h1 class="hero-title">
        <span class="gradient-text">CryptoPoll</span>
      </h1>
      <p class="hero-subtitle">
        A secure, transparent, and verifiable blockchain voting platform for
        your institution
      </p>
      <div class="hero-actions" v-if="!isAuthenticated">
        <router-link to="/login" class="btn btn-primary">
          <PhSignIn :size="18" /> Sign In
        </router-link>
        <router-link to="/register" class="btn btn-secondary">
          <PhUserPlus :size="18" /> Get Started
        </router-link>
      </div>
      <div v-else class="hero-actions">
        <router-link to="/elections" class="btn btn-primary">
          <PhArchive :size="18" /> View Elections
        </router-link>
      </div>
    </div>

    <div class="features-grid">
      <div class="feature-card card glass">
        <div class="feature-icon">
          <PhLock :size="28" weight="fill" color="var(--accent)" />
        </div>
        <h3>End-to-End Encrypted</h3>
        <p>
          Your vote is encrypted on your device before transmission. Only you
          control your cryptographic keys.
        </p>
      </div>
      <div class="feature-card card glass">
        <div class="feature-icon">
          <PhLink :size="28" weight="fill" color="var(--accent)" />
        </div>
        <h3>Blockchain Verified</h3>
        <p>
          Every vote is recorded on an immutable blockchain. Verify your vote
          was counted without revealing your choice.
        </p>
      </div>
      <div class="feature-card card glass">
        <div class="feature-icon">
          <PhGlobe :size="28" weight="fill" color="var(--accent)" />
        </div>
        <h3>Accessible Anywhere</h3>
        <p>
          Vote from anywhere using your institutional credentials. Secure,
          private, and convenient.
        </p>
      </div>
    </div>

    <div class="steps-section">
      <h2 class="section-title">How It Works</h2>
      <div class="steps-grid">
        <div v-for="(step, i) in steps" :key="i" class="step-card glass">
          <div class="step-number">{{ i + 1 }}</div>
          <component
            :is="step.icon"
            :size="24"
            weight="fill"
            color="var(--accent)"
          />
          <h4>{{ step.title }}</h4>
          <p>{{ step.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import {
  PhShieldCheck,
  PhSignIn,
  PhUserPlus,
  PhArchive,
  PhLock,
  PhLink,
  PhGlobe,
  PhIdentificationBadge,
  PhEnvelope,
  PhCheckSquare,
  PhSealCheck,
} from "@phosphor-icons/vue";

export default {
  name: "HomeView",
  components: {
    PhShieldCheck,
    PhSignIn,
    PhUserPlus,
    PhArchive,
    PhLock,
    PhLink,
    PhGlobe,
    PhIdentificationBadge,
    PhEnvelope,
    PhCheckSquare,
    PhSealCheck,
  },
  data() {
    return {
      steps: [
        {
          icon: PhIdentificationBadge,
          title: "Register",
          description: "Create an account using your university ID",
        },
        {
          icon: PhEnvelope,
          title: "Verify",
          description: "Verify your identity via email confirmation",
        },
        {
          icon: PhCheckSquare,
          title: "Vote",
          description: "Cast your encrypted vote in active elections",
        },
        {
          icon: PhSealCheck,
          title: "Verify",
          description: "Verify your vote was counted on the blockchain",
        },
      ],
    };
  },
  computed: {
    ...mapGetters(["isAuthenticated"]),
  },
};
</script>

<style scoped>
.hero {
  text-align: center;
  padding: var(--space-16) 0 var(--space-12);
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-6);
}

.hero-title {
  font-size: 3rem;
  font-weight: 800;
  margin-bottom: var(--space-4);
  line-height: 1.1;
}

.hero-subtitle {
  font-size: 1.1rem;
  color: var(--text-secondary);
  max-width: 500px;
  margin: 0 auto var(--space-8);
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
  flex-wrap: wrap;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
  margin-bottom: var(--space-12);
}

.feature-card {
  padding: var(--space-8);
  text-align: center;
}

.feature-icon {
  margin-bottom: var(--space-4);
}

.feature-card h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: var(--space-2);
  color: var(--text-primary);
}

.feature-card p {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

.section-title {
  text-align: center;
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: var(--space-8);
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-5);
}

.step-card {
  padding: var(--space-6);
  text-align: center;
  border-radius: var(--radius-lg);
  position: relative;
}

.step-number {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent-gradient);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
}

.step-card h4 {
  font-size: 1rem;
  font-weight: 700;
  margin: var(--space-3) 0 var(--space-2);
  color: var(--text-primary);
}

.step-card p {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }
  .features-grid {
    grid-template-columns: 1fr;
  }
  .steps-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 480px) {
  .steps-grid {
    grid-template-columns: 1fr;
  }
}
</style>
