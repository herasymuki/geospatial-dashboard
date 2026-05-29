<template>
  <div class="stat-bar">
    <div v-for="s in stats" :key="s.label" class="stat-item">
      <i :class="[s.icon, 'stat-icon', s.color]"></i>
      <div>
        <div class="stat-value" :class="s.color">{{ s.value }}</div>
        <div class="stat-label">{{ s.label }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useConflictsStore } from '@/stores/conflicts'

const store = useConflictsStore()

const stats = computed(() => [
  { icon: 'fa-solid fa-bolt',             label: 'Events',     value: store.stats.totalEvents.toLocaleString(),     color: 'text-blue-400'  },
  { icon: 'fa-solid fa-skull',            label: 'Fatalities', value: store.stats.totalFatalities.toLocaleString(), color: 'text-red-400'   },
  { icon: 'fa-solid fa-earth-africa',     label: 'Countries',  value: store.stats.countries,                        color: 'text-amber-400' },
  { icon: 'fa-solid fa-circle-exclamation', label: 'Critical', value: store.stats.bySeverity.critical,              color: 'text-red-500'   },
])
</script>

<style scoped>
.stat-bar { display: flex; gap: 20px; }
.stat-item { display: flex; align-items: center; gap: 7px; }
.stat-icon { font-size: 13px; }
.stat-value {
  font-size: 14px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  line-height: 1;
}
.stat-label {
  font-size: 9px;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 2px;
}
.text-blue-400  { color: #60a5fa; }
.text-red-400   { color: #f87171; }
.text-red-500   { color: #ef4444; }
.text-amber-400 { color: #fbbf24; }
</style>
