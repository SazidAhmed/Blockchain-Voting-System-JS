import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import ElectionsView from '../views/ElectionsView.vue'
import VoteView from '../views/VoteView.vue'
import ResultsView from '../views/ResultsView.vue'
import BlockchainExplorer from '../views/BlockchainExplorer.vue'
import ElectionDetailView from '../views/ElectionDetailView.vue'

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
      path: '/elections/:id',
      name: 'election-detail',
      component: ElectionDetailView,
      meta: { requiresAuth: true }
    },
    {
      path: '/results',
      name: 'results',
      component: ResultsView,
      meta: { requiresAuth: true }
    },
    {
      path: '/explorer',
      name: 'explorer',
      component: BlockchainExplorer
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue')
    }
  ]
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const user = JSON.parse(localStorage.getItem('voter_user') || 'null')
  const isAuthenticated = !!user

  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!isAuthenticated) {
      next({ name: 'login', query: { redirect: to.fullPath } })
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router