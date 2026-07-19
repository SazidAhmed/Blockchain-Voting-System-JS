<template>
  <nav class="navbar glass">
    <div class="nav-inner">
      <router-link to="/" class="nav-brand">
        <PhShieldCheck :size="24" weight="fill" color="var(--accent)" />
        <span class="brand-text gradient-text">CryptoPoll</span>
      </router-link>

      <button
        class="hamburger"
        @click="mobileOpen = !mobileOpen"
        aria-label="Toggle menu"
      >
        <PhX v-if="mobileOpen" :size="24" />
        <PhList v-else :size="24" />
      </button>

      <div class="nav-links" :class="{ open: mobileOpen }">
        <router-link to="/" class="nav-link" @click="mobileOpen = false">
          <PhHouse :size="18" /> Home
        </router-link>
        <router-link
          v-if="isAuthenticated"
          to="/elections"
          class="nav-link"
          @click="mobileOpen = false"
        >
          <PhArchive :size="18" /> Elections
        </router-link>
        <router-link
          v-if="isAuthenticated"
          to="/results"
          class="nav-link"
          @click="mobileOpen = false"
        >
          <PhChartBar :size="18" /> Results
        </router-link>
        <router-link
          to="/explorer"
          class="nav-link"
          @click="mobileOpen = false"
        >
          <PhMagnifyingGlass :size="18" /> Explorer
        </router-link>

        <div class="nav-divider"></div>

        <button
          class="theme-toggle"
          @click="toggleTheme"
          :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          <PhSun v-if="isDark" :size="18" />
          <PhMoon v-else :size="18" />
        </button>

        <template v-if="isAuthenticated">
          <div
            class="nav-user"
            @mouseenter="showProfile = true"
            @mouseleave="showProfile = false"
          >
            <PhUser :size="18" />
            <span class="user-name">{{
              currentUser?.name || currentUser?.studentId
            }}</span>
            <button class="btn-logout" @click="handleLogout">
              <PhSignOut :size="16" /> Logout
            </button>

            <Transition name="profile-pop">
              <div v-if="showProfile" class="profile-card glass">
                <div class="profile-header">
                  <PhUser :size="32" weight="fill" color="var(--accent)" />
                  <div>
                    <div class="profile-name">
                      {{ currentUser?.name || "User" }}
                    </div>
                    <div class="profile-id">
                      {{ currentUser?.institutionId || currentUser?.studentId }}
                    </div>
                  </div>
                </div>
                <div class="profile-details">
                  <div class="profile-row" v-if="currentUser?.email">
                    <PhEnvelope :size="14" />
                    <span>{{ currentUser.email }}</span>
                  </div>
                  <div
                    class="profile-row"
                    v-if="currentUser?.firstName || currentUser?.lastName"
                  >
                    <PhIdentificationBadge :size="14" />
                    <span>{{
                      [currentUser.firstName, currentUser.lastName]
                        .filter(Boolean)
                        .join(" ")
                    }}</span>
                  </div>
                  <div class="profile-row">
                    <PhShieldCheck :size="14" />
                    <span>Voter</span>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </template>
        <template v-else>
          <router-link to="/login" class="nav-link" @click="mobileOpen = false">
            <PhSignIn :size="18" /> Login
          </router-link>
          <router-link
            to="/register"
            class="nav-link"
            @click="mobileOpen = false"
          >
            <PhUserPlus :size="18" /> Register
          </router-link>
        </template>
      </div>
    </div>
  </nav>
</template>

<script>
import {
  PhShieldCheck,
  PhHouse,
  PhArchive,
  PhChartBar,
  PhMagnifyingGlass,
  PhUser,
  PhSignOut,
  PhSignIn,
  PhUserPlus,
  PhList,
  PhX,
  PhSun,
  PhMoon,
  PhEnvelope,
  PhIdentificationBadge,
} from "@phosphor-icons/vue";

export default {
  name: "NavBar",
  components: {
    PhShieldCheck,
    PhHouse,
    PhArchive,
    PhChartBar,
    PhMagnifyingGlass,
    PhUser,
    PhSignOut,
    PhSignIn,
    PhUserPlus,
    PhList,
    PhX,
    PhSun,
    PhMoon,
    PhEnvelope,
    PhIdentificationBadge,
  },
  data() {
    return {
      mobileOpen: false,
      showProfile: false,
      isDark: this.resolveInitialTheme(),
    };
  },
  computed: {
    isAuthenticated() {
      return this.$store.getters.isAuthenticated;
    },
    currentUser() {
      return this.$store.getters.currentUser;
    },
  },
  methods: {
    handleLogout() {
      this.$store.dispatch("logout");
      this.$router.push("/login");
    },
    resolveInitialTheme() {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    },
    applyTheme(dark) {
      document.documentElement.setAttribute(
        "data-theme",
        dark ? "dark" : "light",
      );
    },
    toggleTheme() {
      this.isDark = !this.isDark;
      localStorage.setItem("theme", this.isDark ? "dark" : "light");
      this.applyTheme(this.isDark);
    },
  },
  created() {
    this.applyTheme(this.isDark);
  },
  watch: {
    $route() {
      this.mobileOpen = false;
    },
  },
};
</script>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid var(--border);
}

.nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-6);
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  flex-shrink: 0;
}

.brand-text {
  font-size: 1.25rem;
  font-weight: 700;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
}

.nav-link:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.nav-link.router-link-active {
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}

.nav-divider {
  width: 1px;
  height: 24px;
  background: var(--border);
  margin: 0 8px;
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 8px 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
}

.user-name {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary);
}

.btn-logout {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-logout:hover {
  border-color: var(--error);
  color: var(--error);
}

.hamburger {
  display: none;
  background: none;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  padding: 8px;
}

.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.theme-toggle:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.nav-user {
  position: relative;
}

.profile-card {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 260px;
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: 200;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border);
}

.profile-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.profile-id {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.profile-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.profile-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.profile-pop-enter-active,
.profile-pop-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}
.profile-pop-enter-from,
.profile-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 768px) {
  .hamburger {
    display: flex;
  }

  .nav-links {
    display: none;
    position: fixed;
    top: 60px;
    right: 0;
    width: 280px;
    height: calc(100vh - 60px);
    flex-direction: column;
    background: var(--bg-card);
    border-left: 1px solid var(--border);
    padding: var(--space-4);
    gap: 2px;
    overflow-y: auto;
  }

  .nav-links.open {
    display: flex;
  }

  .nav-link {
    width: 100%;
    padding: 12px;
  }

  .nav-divider {
    width: 100%;
    height: 1px;
    margin: 8px 0;
  }

  .nav-user {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
