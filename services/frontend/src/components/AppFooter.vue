<template>
  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <PhShieldCheck :size="16" weight="fill" color="var(--accent)" />
        <span>CryptoPoll</span>
      </div>
      <p class="footer-text">
        Secure Blockchain-Based Voting System — Cryptographically Protected
      </p>
      <div class="footer-links"></div>
    </div>
  </footer>
</template>

<script>
import { PhShieldCheck } from "@phosphor-icons/vue";

export default {
  name: "AppFooter",
  components: { PhShieldCheck },
};
</script>

<style scoped>
.footer {
  border-top: 1px solid var(--border);
  background: var(--bg-card);
  margin-top: auto;
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-6);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.footer-text {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-align: center;
}
</style>
