import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    exclude: ['globe.gl', 'deck.gl', '@deck.gl/core', '@deck.gl/layers', '@deck.gl/aggregation-layers'],
  },
  build: {
    outDir:    'dist',
    sourcemap: false,
    target:    'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'deck':    ['@deck.gl/core', '@deck.gl/layers', '@deck.gl/aggregation-layers'],
          'globe':   ['globe.gl'],
          'charts':  ['chart.js', 'vue-chartjs'],
          'leaflet': ['leaflet'],
          'vendor':  ['vue', 'pinia', 'vue-router', 'axios', 'dayjs', 'marked'],
        }
      }
    }
  }
})
