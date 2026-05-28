<template>
  <div class="drilldown panel">
    <div class="panel-header">
      <span>🔍</span> DRILL-DOWN
      <span v-if="event" class="ml-auto flex items-center gap-2">
        <span :class="['badge', severityBadge]">{{ event.severity?.toUpperCase() }}</span>
        <button class="close-btn" @click="store.clearSelection()">✕</button>
      </span>
    </div>

    <!-- Empty state -->
    <div v-if="!event" class="empty-state">
      <div class="empty-icon">📍</div>
      <p>Click any event on the globe or map to inspect details</p>
      <div v-if="store.topCountries.length" class="top-countries">
        <div class="tc-label">TOP CONFLICT ZONES</div>
        <div
          v-for="c in store.topCountries.slice(0, 6)"
          :key="c.country"
          class="tc-row"
          @click="selectCountry(c)"
        >
          <span class="tc-name">{{ c.country }}</span>
          <div class="tc-bar-wrap">
            <div class="tc-bar"
              :style="{
                width: (c.fatalities / store.topCountries[0].fatalities * 100) + '%',
                background: fatalityColor(c.fatalities)
              }"
            ></div>
          </div>
          <span class="tc-val">{{ c.fatalities.toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <!-- Event detail -->
    <div v-else class="event-detail">
      <!-- Header -->
      <div class="detail-header">
        <div class="detail-type">{{ event.type }}</div>
        <div class="detail-sub" v-if="event.subtype">{{ event.subtype }}</div>
        <div class="detail-meta">
          <span>📅 {{ event.date }}</span>
          <span>🌍 {{ event.country }}</span>
          <span class="source-tag" :class="`src-${event.source?.toLowerCase()}`">
            {{ event.source }}
          </span>
        </div>
      </div>

      <!-- Stats row -->
      <div class="detail-stats">
        <div class="stat-card">
          <div class="stat-val" :class="event.fatalities > 0 ? 'text-red-400' : 'text-green-400'">
            {{ event.fatalities.toLocaleString() }}
          </div>
          <div class="stat-lbl">Fatalities</div>
        </div>
        <div class="stat-card">
          <div class="stat-val text-blue-400">{{ event.lat?.toFixed(3) }}</div>
          <div class="stat-lbl">Latitude</div>
        </div>
        <div class="stat-card">
          <div class="stat-val text-blue-400">{{ event.lng?.toFixed(3) }}</div>
          <div class="stat-lbl">Longitude</div>
        </div>
      </div>

      <!-- Actors -->
      <div v-if="event.actor1 || event.actor2" class="section">
        <div class="section-label">ACTORS</div>
        <div class="actor-row">
          <span class="actor actor-a">{{ event.actor1 || '—' }}</span>
          <span class="vs">vs</span>
          <span class="actor actor-b">{{ event.actor2 || '—' }}</span>
        </div>
      </div>

      <!-- Notes -->
      <div v-if="event.notes && !event.notes.startsWith('http')" class="section">
        <div class="section-label">NOTES</div>
        <p class="notes-text">
          {{ event.notes.slice(0, 280) }}{{ event.notes.length > 280 ? '…' : '' }}
        </p>
      </div>

      <!-- Source link -->
      <div v-if="event.notes && event.notes.startsWith('http')" class="section">
        <a :href="event.notes" target="_blank" class="source-link">
          🔗 View source article ↗
        </a>
      </div>

      <!-- Country context -->
      <div v-if="countryStats" class="section">
        <div class="section-label">{{ event.country }} — DATASET TOTAL</div>
        <div class="country-stats">
          <div class="cs-item">
            <span class="cs-val text-blue-400">{{ countryStats.count.toLocaleString() }}</span>
            <span class="cs-lbl">events</span>
          </div>
          <div class="cs-item">
            <span class="cs-val text-red-400">{{ countryStats.fatalities.toLocaleString() }}</span>
            <span class="cs-lbl">fatalities</span>
          </div>
        </div>
        <!-- Severity bar -->
        <div class="sev-bar-wrap">
          <div
            v-for="(count, sev) in countrySeverityBreakdown"
            :key="sev"
            class="sev-seg"
            :style="{ width: (count / countryStats.count * 100) + '%', background: sevColor(sev) }"
            :title="`${sev}: ${count}`"
          ></div>
        </div>
      </div>

      <!-- AI Analysis button -->
      <button class="ai-btn" @click="requestAI" :disabled="aiStore.streaming">
        <span>✦</span> {{ aiStore.streaming ? 'Analysing…' : 'AI Intelligence Brief' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useConflictsStore } from '@/stores/conflicts'
import { useAIStore } from '@/stores/ai'

const store   = useConflictsStore()
const aiStore = useAIStore()

const event = computed(() => store.selectedEvent)

const severityBadge = computed(() => ({
  critical: 'badge-red',
  high:     'badge-amber',
  medium:   'badge-blue',
  low:      'badge-green',
}[event.value?.severity] || 'badge-blue'))

const countryStats = computed(() => {
  if (!event.value?.country) return null
  return store.eventsByCountry[event.value.country] || null
})

const countrySeverityBreakdown = computed(() => {
  if (!event.value?.country) return {}
  const evts = store.filteredEvents.filter(e => e.country === event.value.country)
  const breakdown = { critical: 0, high: 0, medium: 0, low: 0 }
  evts.forEach(e => { if (breakdown[e.severity] !== undefined) breakdown[e.severity]++ })
  return breakdown
})

function sevColor(sev) {
  return { critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#10b981' }[sev] || '#475569'
}

function fatalityColor(n) {
  if (n > 5000) return '#ef4444'
  if (n > 1000) return '#f59e0b'
  if (n > 200)  return '#eab308'
  return '#3b82f6'
}

function selectCountry(c) {
  if (c.events?.length) store.selectEvent(c.events[0])
}

function requestAI() {
  if (!event.value) return
  aiStore.analyzeConflict({
    event:        event.value,
    countryStats: countryStats.value,
    totalEvents:  store.stats.totalEvents
  })
}
</script>

<style scoped>
.drilldown {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border-radius: 0;
  border-top: none;
  border-right: none;
  border-left: none;
}
.close-btn {
  background: transparent;
  border: none;
  color: #475569;
  cursor: pointer;
  font-size: 11px;
  padding: 0 2px;
}
.close-btn:hover { color: #ef4444; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 12px;
  gap: 8px;
  color: #475569;
  font-size: 11px;
  text-align: center;
}
.empty-icon { font-size: 24px; }

.top-countries { width: 100%; margin-top: 8px; }
.tc-label { font-size: 9px; font-weight: 600; letter-spacing: 0.1em; color: #475569; margin-bottom: 8px; text-align: left; }
.tc-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
  cursor: pointer;
  padding: 3px 4px;
  border-radius: 3px;
  transition: background 0.1s;
}
.tc-row:hover { background: rgba(59,130,246,0.06); }
.tc-name { font-size: 10px; color: #94a3b8; width: 80px; flex-shrink: 0; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tc-bar-wrap { flex: 1; height: 4px; background: #1a2235; border-radius: 2px; overflow: hidden; }
.tc-bar { height: 100%; border-radius: 2px; transition: width 0.3s; }
.tc-val { font-size: 9px; color: #64748b; font-family: 'JetBrains Mono', monospace; width: 40px; text-align: right; }

.event-detail { padding: 10px 12px; }
.detail-header { margin-bottom: 10px; }
.detail-type { font-size: 13px; font-weight: 600; color: #e2e8f0; margin-bottom: 2px; }
.detail-sub  { font-size: 11px; color: #64748b; margin-bottom: 5px; }
.detail-meta { display: flex; flex-wrap: wrap; gap: 6px; font-size: 10px; color: #64748b; }
.source-tag {
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 600;
}
.src-acled     { background: rgba(239,68,68,0.15);  color: #ef4444; }
.src-ucdp      { background: rgba(245,158,11,0.15); color: #f59e0b; }
.src-gdelt     { background: rgba(6,182,212,0.15);  color: #06b6d4; }
.src-reliefweb { background: rgba(16,185,129,0.15); color: #10b981; }

.detail-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-bottom: 10px;
}
.stat-val { font-size: 16px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
.stat-lbl { font-size: 9px; color: #475569; margin-top: 2px; }

.section { margin-bottom: 10px; }
.section-label {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: #475569;
  margin-bottom: 5px;
}
.actor-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.actor { font-size: 10px; padding: 3px 8px; border-radius: 3px; }
.actor-a { background: rgba(239,68,68,0.1);  color: #ef4444; }
.actor-b { background: rgba(59,130,246,0.1); color: #3b82f6; }
.vs { font-size: 9px; color: #475569; }

.notes-text { font-size: 10px; color: #94a3b8; line-height: 1.5; }
.source-link { font-size: 10px; color: #3b82f6; text-decoration: none; }
.source-link:hover { text-decoration: underline; }

.country-stats { display: flex; gap: 16px; margin-bottom: 6px; }
.cs-item { display: flex; align-items: baseline; gap: 4px; }
.cs-val  { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700; }
.cs-lbl  { font-size: 9px; color: #475569; }

.sev-bar-wrap {
  display: flex;
  height: 5px;
  border-radius: 3px;
  overflow: hidden;
  gap: 1px;
}
.sev-seg { height: 100%; transition: width 0.3s; }

.ai-btn {
  width: 100%;
  margin-top: 10px;
  padding: 7px 12px;
  background: rgba(59,130,246,0.1);
  border: 1px solid rgba(59,130,246,0.3);
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
.ai-btn:hover:not(:disabled) { background: rgba(59,130,246,0.18); border-color: rgba(59,130,246,0.5); }
.ai-btn:disabled { opacity: 0.5; cursor: default; }
</style>
