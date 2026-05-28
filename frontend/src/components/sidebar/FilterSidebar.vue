<template>
  <div class="sidebar">
    <div class="panel-header"><span>⚙</span> FILTERS</div>

    <!-- Date Range -->
    <div class="filter-section">
      <div class="filter-label">DATE RANGE</div>
      <input type="date" v-model="filters.dateFrom" class="date-input" @change="apply" />
      <input type="date" v-model="filters.dateTo"   class="date-input" @change="apply" />
    </div>

    <!-- Min Fatalities -->
    <div class="filter-section">
      <div class="filter-label">MIN FATALITIES: <span class="filter-val">{{ filters.minFatalities }}</span></div>
      <input type="range" min="0" max="500" step="5"
        v-model.number="filters.minFatalities" @input="apply" class="range-input" />
    </div>

    <!-- Data Sources -->
    <div class="filter-section">
      <div class="filter-label">DATA SOURCES</div>
      <label v-for="src in sources" :key="src.id" class="source-toggle">
        <input type="checkbox" v-model="filters.sources[src.id]" @change="apply" />
        <span class="toggle-dot" :style="{ background: src.color }"></span>
        <span class="toggle-label">{{ src.label }}</span>
        <span class="toggle-count">{{ sourceCounts[src.id] }}</span>
      </label>
    </div>

    <!-- Event Types -->
    <div class="filter-section">
      <div class="filter-label">EVENT TYPES</div>
      <label v-for="et in eventTypes" :key="et" class="type-toggle">
        <input type="checkbox" :value="et" v-model="filters.eventTypes" @change="apply" />
        <span>{{ et }}</span>
      </label>
      <button v-if="filters.eventTypes.length" class="clear-btn" @click="clearTypes">Clear</button>
    </div>

    <!-- Stats summary -->
    <div class="filter-section stats-summary">
      <div class="filter-label">CURRENT SELECTION</div>
      <div class="stat-row">
        <span class="stat-key">Events</span>
        <span class="stat-num text-blue-400">{{ store.stats.totalEvents.toLocaleString() }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-key">Fatalities</span>
        <span class="stat-num text-red-400">{{ store.stats.totalFatalities.toLocaleString() }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-key">Countries</span>
        <span class="stat-num text-amber-400">{{ store.stats.countries }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-key">High Severity</span>
        <span class="stat-num text-red-500">{{ store.stats.highSeverity }}</span>
      </div>
    </div>

    <!-- Refresh -->
    <div class="filter-section">
      <button class="refresh-btn" @click="store.loadAllData()" :disabled="store.loading">
        <span>{{ store.loading ? '⟳' : '↻' }}</span>
        {{ store.loading ? 'Loading…' : 'Refresh Data' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useConflictsStore } from '@/stores/conflicts'

const store   = useConflictsStore()
const filters = store.filters

const sources = [
  { id: 'acled',      label: 'ACLED',      color: '#ef4444' },
  { id: 'ucdp',       label: 'UCDP',       color: '#f59e0b' },
  { id: 'gdelt',      label: 'GDELT',      color: '#06b6d4' },
  { id: 'reliefweb',  label: 'ReliefWeb',  color: '#10b981' },
]

const eventTypes = [
  'Battles', 'Violence against civilians',
  'Explosions/Remote violence', 'Protests', 'Riots',
  'Strategic developments', 'Armed Conflict'
]

const sourceCounts = computed(() => {
  const counts = { acled: 0, ucdp: 0, gdelt: 0, reliefweb: 0 }
  store.allEvents.forEach(e => {
    const key = e.source.toLowerCase()
    if (counts[key] !== undefined) counts[key]++
  })
  return counts
})

function apply()      { /* reactive — filters are already reactive in store */ }
function clearTypes() { filters.eventTypes = [] }
</script>

<style scoped>
.sidebar {
  background: #0d1424;
  height: 100%;
  overflow-y: auto;
}
.filter-section {
  padding: 10px 12px;
  border-bottom: 1px solid #1a2235;
}
.filter-label {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: #475569;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.filter-val { color: #3b82f6; }

.date-input {
  width: 100%;
  background: #111827;
  border: 1px solid #1e2d45;
  border-radius: 4px;
  color: #94a3b8;
  font-size: 11px;
  padding: 4px 8px;
  margin-bottom: 4px;
  outline: none;
}
.date-input:focus { border-color: #3b82f6; }

.range-input {
  width: 100%;
  accent-color: #3b82f6;
  cursor: pointer;
}

.source-toggle, .type-toggle {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 5px;
  cursor: pointer;
}
.source-toggle input, .type-toggle input { accent-color: #3b82f6; cursor: pointer; }
.toggle-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.toggle-label { flex: 1; }
.toggle-count { font-size: 10px; color: #475569; font-family: 'JetBrains Mono', monospace; }

.clear-btn {
  font-size: 10px;
  color: #ef4444;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin-top: 2px;
}

.stats-summary { background: #0a0e1a; }
.stat-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
.stat-key { font-size: 10px; color: #475569; }
.stat-num { font-size: 12px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }

.refresh-btn {
  width: 100%;
  padding: 7px;
  background: rgba(59,130,246,0.08);
  border: 1px solid rgba(59,130,246,0.2);
  border-radius: 5px;
  color: #3b82f6;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s;
}
.refresh-btn:hover:not(:disabled) { background: rgba(59,130,246,0.15); }
.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
