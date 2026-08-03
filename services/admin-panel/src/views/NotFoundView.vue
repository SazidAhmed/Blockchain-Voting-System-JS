<template>
  <div class="not-found">
    <div class="not-found-content card glass">
      <h1>404</h1>
      <p>Page Not Found</p>
      <p class="sub">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <router-link to="/dashboard" class="btn btn-primary"
        >Go to Dashboard</router-link
      >
    </div>
  </div>
</template>

<script>
export default { name: "AdminNotFoundView" };
</script>

<style scoped>
.not-found {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}
.not-found-content {
  text-align: center;
  padding: var(--space-12);
}
.not-found-content h1 {
  font-size: 4rem;
  font-weight: 800;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 var(--space-2);
}
.not-found-content p {
  font-size: 1.2rem;
  color: var(--text-primary);
  margin: 0 0 var(--space-2);
}
.not-found-content .sub {
  color: var(--text-muted);
  font-size: 0.95rem;
  margin-bottom: var(--space-6);
}
</style>
