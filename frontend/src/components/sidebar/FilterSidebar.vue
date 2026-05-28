<template>
  <div class="sidebar">
    <div class="panel-header"><span>⚙</span> FILTERS</div>

    <!-- Refresh button -->
    <div class="filter-section">
      <button class="refresh-btn" @click="store.fetchAllData()" :disabled="store.loading">
        <span :class="{ spinning: store.loading }">↻</span>
        {{ store.loading ? 'Loading…' : 'Refresh Data' }}
      </button>
      <div v-if="store.lastUpdated" class="last-updated">
        Updated {{ formatTime(store.lastUpdated) }}
      </div>
    </div>

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
      <label v-for="et in store.eventTypes" :key="et" class="type-toggle">
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
        <span class="stat-num text-red-500">{{ store.stats.bySeverity.critical }}</span>
      </div>
    </div>

    <!-- Error display -->
    <div v-if="store.error" class="error-box">
      ⚠ {{ store.error }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useConflictsStore } from '@/stores/conflicts'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const store   = useConflictsStore()
const filters = store.filters

const sources = [
  { id: 'acled',     label: 'ACLED',      color: '#ef4444' },
  { id: 'ucdp',      label: 'UCDP',       color: '#f59e0b' },
  { id: 'gdelt',     label: 'GDELT',      color: '#6366f1' },
  { id: 'reliefweb', label: 'ReliefWeb',  color: '#10b981' },
]

const severities = [
  { id: 'critical', label: 'Critical (100+ fatalities)', color: '#ef4444' },
  { id: 'high',     label: 'High (20–99)',               color: '#f59e0b' },
  { id: 'medium',   label: 'Medium (5–19)',              color: '#eab308' },
  { id: 'low',      label: 'Low (0–4)',                  color: '#3b82f6' },
]

const sourceCounts = computed(() => {
  const counts = { acled: 0, ucdp: 0, gdelt: 0, reliefweb: 0 }
  store.allEvents.forEach(e => {
    const k = e.source.toLowerCase()
    if (counts[k] !== undefined) counts[k]++
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

function formatTime(iso) {
  return dayjs(iso).fromNow()
}
</script>

<style scoped>
.sidebar {
  width: 220px;
  min-width: 220px;
  height: 100%;
  background: #0d1424;
  border-right: 1px solid #1e2d45;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.sidebar::-webkit-scrollbar { width: 4px; }
.sidebar::-webkit-scrollbar-track { background: transparent; }
.sidebar::-webkit-scrollbar-thumb { background: #1e2d45; border-radius: 2px; }

.panel-header {
  padding: 10px 12px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #475569;
  text-transform: uppercase;
  border-bottom: 1px solid #1e2d45;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.filter-section {
  padding: 10px 12px;
  border-bottom: 1px solid #0f1929;
}

.filter-label {
  font-size: 9px;
  font-weight: 700;
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
  border-radius: 3px;
  color: #94a3b8;
  font-size: 10px;
  padding: 4px 6px;
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
  color: #334155;
  margin-top: 2px;
}

.source-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 3px 0;
  font-size: 10px;
  color: #94a3b8;
}
.source-toggle input[type="checkbox"] { accent-color: #3b82f6; cursor: pointer; }
.toggle-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.toggle-label { flex: 1; font-size: 10px; }
.toggle-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: #475569;
}

.type-toggle {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  padding: 2px 0;
  font-size: 9px;
  color: #64748b;
}
.type-toggle input[type="checkbox"] { accent-color: #3b82f6; cursor: pointer; }

.clear-btn {
  background: transparent;
  border: none;
  color: #3b82f6;
  font-size: 9px;
  cursor: pointer;
  padding: 0;
}
.clear-btn:hover { color: #60a5fa; }

.stats-summary {}
.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
  font-size: 10px;
}
.stat-key { color: #475569; }
.stat-num { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 11px; }
.text-blue-400  { color: #60a5fa; }
.text-red-400   { color: #f87171; }
.text-red-500   { color: #ef4444; }
.text-amber-400 { color: #fbbf24; }

.refresh-btn {
  width: 100%;
  padding: 6px 10px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid #1e3a5f;
  border-radius: 4px;
  color: #3b82f6;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}
.refresh-btn:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.2);
  border-color: #3b82f6;
}
.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.spinning { display: inline-block; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.last-updated {
  font-size: 9px;
  color: #334155;
  text-align: center;
  margin-top: 4px;
}

.error-box {
  margin: 8px 12px;
  padding: 6px 8px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 4px;
  font-size: 9px;
  color: #f87171;
}
</style>
