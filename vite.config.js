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
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/vue") || id.includes("node_modules/pinia") || id.includes("node_modules/vue-router")) {
            return "vendor-vue";
          }
          if (id.includes("node_modules/three") || id.includes("node_modules/globe.gl") || id.includes("node_modules/three-globe")) {
            return "vendor-three";
          }
          if (id.includes("node_modules/@deck.gl") || id.includes("node_modules/@luma.gl") || id.includes("node_modules/@loaders.gl") || id.includes("node_modules/@math.gl")) {
            return "vendor-deck";
          }
          if (id.includes("node_modules/chart.js") || id.includes("node_modules/vue-chartjs")) {
            return "vendor-charts";
          }
          if (id.includes("node_modules/d3") || id.includes("node_modules/d3-")) {
            return "vendor-d3";
          }
          if (id.includes("node_modules/@fortawesome")) {
            return "vendor-fa";
          }
        }
      }
    }
  },
  optimizeDeps: { exclude: ["globe.gl"] }
});
