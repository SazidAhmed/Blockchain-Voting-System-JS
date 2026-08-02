import "./assets/tokens.css";

import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";

const app = createApp(App);

app.use(router);
app.use(store);

// Make store globally accessible for API interceptor
window.__vueStore = store;

// Restore cryptographic keys from localStorage if user was previously logged in
store.dispatch("restoreKeys");

app.mount("#app");
