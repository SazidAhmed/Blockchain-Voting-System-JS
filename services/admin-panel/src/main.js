import "./assets/tokens.css";

import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router/index.js";
import { useAuthStore } from "./store/auth.js";

const app = createApp(App);

const pinia = createPinia();
app.use(pinia);

// Initialize auth from localStorage before mounting
const authStore = useAuthStore();
authStore.initializeAuth();

// Make authStore globally accessible for API interceptor
window.__authStore = authStore;

app.use(router);

app.mount("#app");
