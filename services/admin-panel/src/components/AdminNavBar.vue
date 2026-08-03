<template>
  <header class="admin-nav">
    <div class="admin-nav__brand">
      <PhShield :size="24" />
      <span>Admin Panel</span>
    </div>
    <div class="admin-nav__actions">
      <button
        class="admin-nav__theme-btn"
        @click="toggleTheme"
        :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      >
        <PhSun v-if="isDark" :size="18" />
        <PhMoon v-else :size="18" />
      </button>
      <span class="admin-nav__user">{{ user?.username }}</span>
      <button class="admin-nav__logout" @click="handleLogout">
        <PhSignOut :size="18" />
        Logout
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../store/auth";
import { PhShield, PhSun, PhMoon, PhSignOut } from "@phosphor-icons/vue";

const router = useRouter();
const authStore = useAuthStore();
const user = computed(() => authStore.user);
const isDark = ref(false);

onMounted(() => {
  isDark.value = document.documentElement.getAttribute("data-theme") === "dark";
});

function toggleTheme() {
  isDark.value = !isDark.value;
  document.documentElement.setAttribute(
    "data-theme",
    isDark.value ? "dark" : "light",
  );
  localStorage.setItem("theme", isDark.value ? "dark" : "light");
}

function handleLogout() {
  authStore.logout();
  router.push("/login");
}
</script>

<style scoped>
.admin-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  box-sizing: border-box;
}

.admin-nav__brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.admin-nav__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.admin-nav__theme-btn {
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

.admin-nav__theme-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.admin-nav__user {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.admin-nav__logout {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: none;
  color: var(--error, #dc2626);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.admin-nav__logout:hover {
  background: color-mix(in srgb, var(--error, #dc2626) 8%, transparent);
  border-color: var(--error, #dc2626);
}
</style>
