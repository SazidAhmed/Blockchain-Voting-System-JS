import { createRouter, createWebHistory } from "vue-router";
import AdminDashboard from "../views/AdminDashboard.vue";
import LoginView from "../views/LoginView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "login",
      component: LoginView,
    },
    {
      path: "/dashboard",
      name: "dashboard",
      component: AdminDashboard,
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: "/elections",
      name: "elections",
      component: () => import("../views/AdminDashboard.vue"),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: "/elections/new",
      name: "election-new",
      component: () => import("../views/AdminDashboard.vue"),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: "/elections/:id/edit",
      name: "election-edit",
      component: () => import("../views/AdminDashboard.vue"),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: "/audit-logs",
      name: "audit-logs",
      component: () => import("../views/AdminDashboard.vue"),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: "/security-logs",
      name: "security-logs",
      component: () => import("../views/AdminDashboard.vue"),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: () => import("../views/NotFoundView.vue"),
    },
    {
      path: "/",
      redirect: "/dashboard",
    },
  ],
});

// Navigation guard
router.beforeEach((to, from, next) => {
  const user = JSON.parse(localStorage.getItem("admin_user") || "{}");
  const isAuthenticated = !!user && !!user.id;

  if (to.matched.some((record) => record.meta.requiresAuth)) {
    if (!isAuthenticated) {
      next({ name: "login", query: { redirect: to.fullPath } });
    } else if (to.matched.some((record) => record.meta.requiresAdmin)) {
      if (user.role === "admin") {
        next();
      } else {
        next({ name: "login" });
      }
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router;
