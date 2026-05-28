<template>
  <div class="sidebar">
    <div class="panel-header"><span>⚙</span> FILTERS</div>

    <!-- Date Range -->
    <div class="filter-section">
      <div class="filter-label">DATE RANGE</div>
      <input type="date" v-model="filters.dateFrom" class="date-input" />
      <input type="date" v-model="filters.dateTo"   class="date-input" />
    </div>

    <!-- Min Fatalities -->
    <div class="filter-section">
      <div class="filter-label">
        MIN FATALITIES
        <span class="filter-val">{{ filters.minFatalities }}</span>
      </div>
      <input
        type="range" min="0" max="500" step="5"
        v-model.number="filters.minFatalities"
        class="range-input"
      />
      <div class="range-labels">
        <span>0</span><span>100</span><span>200</span><span>300</span><span>500+</span>
      </div>
    </div>

    <!-- Data Sources -->
    <div class="filter-section">
      <div class="filter-label">DATA SOURCES</div>
      <label v-for="src in sources" :key="src.id" class="source-toggle">
        <input type="checkbox" v-model="filters.sources[src.id]" />
        <span class="toggle-dot" :style="{ background: src.color }"></span>
        <span class="toggle-label">{{ src.label }}</span>
        <span class="toggle-count">{{ sourceCounts[src.id] }}</span>
      </label>
    </div>

    <!-- Severity -->
    <div class="filter-section">
      <div class="filter-label">SEVERITY</div>
      <label v-for="sev in severities" :key="sev.id" class="source-toggle">
        <input type="checkbox" :value="sev.id" v-model="filters.severity" />
        <span class="toggle-dot" :style="{ background: sev.color }"></span>
        <span class="toggle-label">{{ sev.label }}</span>
        <span class="toggle-count">{{ severityCounts[sev.id] }}</span>
      </label>
    </div>

    <!-- Event Types -->
    <div class="filter-section">
      <div class="filter-label">
        EVENT TYPES
        <button v-if="filters.eventTypes.length" class="clear-btn" @click="filters.eventTypes = []">
          Clear
        </button>
      </div>
      <label v-for="et in eventTypes" :key="et" class="type-toggle">
        <input type="checkbox" :value="et" v-model="filters.eventTypes" />
        <span>{{ et }}</span>
      </label>
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
        <span class="stat-key">Critical</span>
        <span class="stat-num" style="color:#ef4444">{{ store.stats.bySeverity.critical }}</span>
      </div>
      <div class="stat-row">
        <span class="stat-key">High</span>
        <span class="stat-num" style="color:#f59e0b">{{ store.stats.bySeverity.high }}</span>
      </div>
    </div>

    <!-- Last updated -->
    <div v-if="store.lastUpdated" class="filter-section">
      <div class="filter-label">LAST UPDATED</div>
      <div class="last-updated">{{ formatDate(store.lastUpdated) }}</div>
    </div>

    <!-- Refresh -->
    <div class="filter-section">
      <button class="refresh-btn" @click="store.loadAllData()" :disabled="store.loading">
        <span :class="{ spinning: store.loading }">↻</span>
        {{ store.loading ? 'Loading…' : 'Refresh Data' }}
      </button>
    </div>

    <!-- Error -->
    <div v-if="store.error" class="filter-section error-section">
      ⚠ {{ store.error }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useConflictsStore } from '@/stores/conflicts'
import dayjs from 'dayjs'

const store   = useConflictsStore()
const filters = store.filters

const sources = [
  { id: 'acled',     label: 'ACLED',     color: '#ef4444' },
  { id: 'ucdp',      label: 'UCDP',      color: '#f59e0b' },
  { id: 'gdelt',     label: 'GDELT',     color: '#06b6d4' },
  { id: 'reliefweb', label: 'ReliefWeb', color: '#10b981' },
]

const severities = [
  { id: 'critical', label: 'Critical (100+ fatalities)', color: '#ef4444' },
  { id: 'high',     label: 'High (20–99)',               color: '#f59e0b' },
  { id: 'medium',   label: 'Medium (5–19)',              color: '#3b82f6' },
  { id: 'low',      label: 'Low (0–4)',                  color: '#10b981' },
]

const eventTypes = [
  'Battles',
  'Violence against civilians',
  'Explosions/Remote violence',
  'Protests',
  'Riots',
  'Strategic developments',
  'Armed Conflict',
]

const sourceCounts = computed(() => {
  const counts = { acled: 0, ucdp: 0, gdelt: 0, reliefweb: 0 }
  store.allEvents.forEach(e => {
    const key = e.source.toLowerCase()
    if (counts[key] !== undefined) counts[key]++
  })
  return counts
})

const severityCounts = computed(() => {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 }
  store.filteredEvents.forEach(e => {
    if (counts[e.severity] !== undefined) counts[e.severity]++
  })
  return counts
})

function formatDate(iso) {
  return dayjs(iso).format('MMM D, YYYY HH:mm')
}
</script>

<style scoped>
.sidebar {
  background: #0d1424;
  height: 100%;
  overflow-y: auto;
  border-right: 1px solid #1e2d45;
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
  margin-bottom: 7px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.filter-val {
  font-family: 'JetBrains Mono', monospace;
  color: #3b82f6;
  font-size: 10px;
}
.date-input {
  width: 100%;
  background: #111827;
  border: 1px solid #1e2d45;
  border-radius: 4px;
  color: #94a3b8;
  font-size: 11px;
  padding: 5px 8px;
  margin-bottom: 4px;
  outline: none;
}
.date-input:focus { border-color: #3b82f6; }

.range-input {
  width: 100%;
  accent-color: #3b82f6;
  cursor: pointer;
}
.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 8px;
  color: #475569;
  margin-top: 2px;
}

.source-toggle, .type-toggle {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 5px;
  cursor: pointer;
  font-size: 11px;
  color: #94a3b8;
}
.source-toggle input, .type-toggle input {
  accent-color: #3b82f6;
  cursor: pointer;
}
.toggle-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.toggle-label { flex: 1; }
.toggle-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: #475569;
}

.clear-btn {
  font-size: 9px;
  color: #ef4444;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}

.stats-summary {}
.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.stat-key { font-size: 10px; color: #64748b; }
.stat-num { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; }

.last-updated { font-size: 10px; color: #475569; font-family: 'JetBrains Mono', monospace; }

.refresh-btn {
  width: 100%;
  padding: 7px 12px;
  background: rgba(59,130,246,0.08);
  border: 1px solid rgba(59,130,246,0.25);
  border-radius: 5px;
  color: #3b82f6;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.refresh-btn:hover:not(:disabled) { background: rgba(59,130,246,0.15); }
.refresh-btn:disabled { opacity: 0.5; cursor: default; }

.spinning {
  display: inline-block;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.error-section { font-size: 10px; color: #ef4444; }
</style>
