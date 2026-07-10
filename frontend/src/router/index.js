import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import ElectionsView from '../views/ElectionsView.vue'
import VoteView from '../views/VoteView.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
import ResultsView from '../views/ResultsView.vue'
import VoterPickerView from '../views/VoterPickerView.vue'
import BlockchainExplorer from '../views/BlockchainExplorer.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView
    },
    {
      path: '/admin/dashboard',
      name: 'admin-dashboard',
      component: AdminDashboard,
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/admin',
      redirect: '/admin/dashboard'
    },
    {
      path: '/elections',
      name: 'elections',
      component: ElectionsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/elections/:id/vote',
      name: 'vote',
      component: VoteView,
      meta: { requiresAuth: true }
    },
    {
      path: '/results',
      name: 'results',
      component: ResultsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/voter-picker',
      name: 'voter-picker',
      component: VoterPickerView
    },
    {
      path: '/explorer',
      name: 'explorer',
      component: BlockchainExplorer
    }
  ]
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const isAuthenticated = !!token

  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!isAuthenticated) {
      next({ name: 'login', query: { redirect: to.fullPath } })
    } else if (to.matched.some(record => record.meta.requiresAdmin)) {
      if (user.role === 'admin') {
        next()
      } else {
        next({ name: 'home' })
      }
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router