/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      colors: {
        'dark-bg':    '#0a0e1a',
        'dark-panel': '#111827',
        'dark-card':  '#1a2235',
        'dark-border':'#1e2d45',
        'accent-red': '#ef4444',
        'accent-amber':'#f59e0b',
        'accent-blue': '#3b82f6',
        'accent-cyan': '#06b6d4',
        'accent-green':'#10b981',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
