import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) }
  },
  build: {
    target: "esnext",
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-vue":    ["vue", "vue-router", "pinia"],
          "vendor-three":  ["three"],
          "vendor-deck":   ["deck.gl", "@deck.gl/core", "@deck.gl/layers", "@deck.gl/geo-layers"],
          "vendor-luma":   ["@luma.gl/core"],
          "vendor-charts": ["chart.js", "vue-chartjs"],
          "vendor-d3":     ["d3", "d3-scale-chromatic"]
        }
      }
    }
  },
  optimizeDeps: { exclude: ["globe.gl"] }
});
