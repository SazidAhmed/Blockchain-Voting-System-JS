import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import { useAuthStore } from './store/auth.js'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)

// Initialize auth from localStorage before mounting
const authStore = useAuthStore()
authStore.initializeAuth()

app.use(router)

app.mount('#app')
