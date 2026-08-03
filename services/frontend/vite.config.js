import { fileURLToPath, URL } from "node:url";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const plugins = [vue()];

// Devtools is off by default. Enable with: VITE_DEVTOOLS=true npm run dev
if (process.env.VITE_DEVTOOLS === "true") {
  const { default: vueDevTools } = await import("vite-plugin-vue-devtools");
  plugins.push(vueDevTools());
}

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
