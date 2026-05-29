<template>
  <div class="drilldown panel">
    <div class="panel-header">
      <i class="fa-solid fa-magnifying-glass-chart"></i> DRILL-DOWN
      <span v-if="event" class="ml-auto flex items-center gap-2">
        <span :class="['badge', severityBadge]">{{ event.severity?.toUpperCase() }}</span>
        <button class="close-btn" @click="store.clearSelection()">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </span>
    </div>

    <!-- Empty state -->
    <div v-if="!event" class="empty-state">
      <i class="fa-solid fa-location-crosshairs empty-icon"></i>
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
                width: (c.fatalities / (store.topCountries[0]?.fatalities || 1) * 100) + '%',
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
          <span><i class="fa-regular fa-calendar-days"></i> {{ event.date }}</span>
          <span><i class="fa-solid fa-location-dot"></i> {{ event.country }}</span>
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
        <p class="notes-text">{{ event.notes.slice(0, 280) }}{{ event.notes.length > 280 ? '...' : '' }}</p>
      </div>

      <!-- Source link -->
      <div v-if="event.notes && event.notes.startsWith('http')" class="section">
        <a :href="event.notes" target="_blank" rel="noopener" class="source-link">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> View Source Article
        </a>
      </div>

      <!-- Country context -->
      <div v-if="countryContext" class="section">
        <div class="section-label">COUNTRY CONTEXT</div>
        <div class="ctx-row">
          <span class="ctx-key">Total events</span>
          <span class="ctx-val text-blue-400">{{ countryContext.count }}</span>
        </div>
        <div class="ctx-row">
          <span class="ctx-key">Total fatalities</span>
          <span class="ctx-val text-red-400">{{ countryContext.fatalities.toLocaleString() }}</span>
        </div>
      </div>

      <!-- AI Brief button -->
      <button class="ai-brief-btn" @click="requestAIBrief" :disabled="aiStore.streaming">
        <span v-if="aiStore.streaming">
          <i class="fa-solid fa-circle-notch fa-spin"></i> Analyzing...
        </span>
        <span v-else>
          <i class="fa-solid fa-microchip"></i> AI Intelligence Brief
        </span>
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

const severityBadge = computed(() => {
  const map = {
    critical: 'badge-critical',
    high:     'badge-high',
    medium:   'badge-medium',
    low:      'badge-low',
  }
  return map[event.value?.severity] || 'badge-low'
})

const countryContext = computed(() => {
  if (!event.value) return null
  return store.topCountries.find(c => c.country === event.value.country) || null
})

function fatalityColor(n) {
  if (n >= 500) return '#ef4444'
  if (n >= 100) return '#f59e0b'
  if (n >= 20)  return '#eab308'
  return '#3b82f6'
}

function selectCountry(c) {
  const evts = store.filteredEvents.filter(e => e.country === c.country)
  if (evts.length) store.selectEvent(evts[0])
}

function requestAIBrief() {
  if (!event.value) return
  aiStore.analyzeConflict({
    event:        event.value,
    countryStats: countryContext.value || {},
    totalEvents:  store.stats.totalEvents,
  })
}
</script>

<style scoped>
.drilldown {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 0;
  border-right: none;
  border-top: none;
}
.panel-header {
  padding: 8px 12px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #475569;
  text-transform: uppercase;
  border-bottom: 1px solid #1e2d45;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.ml-auto { margin-left: auto; }
.flex { display: flex; }
.items-center { align-items: center; }
.gap-2 { gap: 8px; }

.badge {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 2px 6px;
  border-radius: 3px;
}
.badge-critical { background: rgba(239,68,68,0.2);  color: #ef4444; }
.badge-high     { background: rgba(245,158,11,0.2); color: #f59e0b; }
.badge-medium   { background: rgba(234,179,8,0.2);  color: #eab308; }
.badge-low      { background: rgba(59,130,246,0.2); color: #3b82f6; }

.close-btn {
  background: transparent;
  border: none;
  color: #475569;
  cursor: pointer;
  font-size: 11px;
  padding: 0 2px;
  line-height: 1;
  display: flex;
  align-items: center;
}
.close-btn:hover { color: #ef4444; }

/* Empty state */
.empty-state {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.empty-icon { font-size: 22px; opacity: 0.3; color: #3b82f6; }
.empty-state p { font-size: 10px; color: #334155; text-align: center; }

.top-countries { width: 100%; margin-top: 8px; }
.tc-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #334155;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.tc-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  cursor: pointer;
  border-radius: 3px;
  transition: background 0.1s;
}
.tc-row:hover { background: rgba(59,130,246,0.05); }
.tc-name { font-size: 9px; color: #94a3b8; width: 70px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tc-bar-wrap { flex: 1; height: 4px; background: #0f1929; border-radius: 2px; overflow: hidden; }
.tc-bar { height: 100%; border-radius: 2px; transition: width 0.3s; }
.tc-val { font-size: 9px; font-family: 'JetBrains Mono', monospace; color: #475569; width: 40px; text-align: right; }

/* Event detail */
.event-detail {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.event-detail::-webkit-scrollbar { width: 3px; }
.event-detail::-webkit-scrollbar-thumb { background: #1e2d45; }

.detail-header {}
.detail-type { font-size: 12px; font-weight: 700; color: #e2e8f0; margin-bottom: 2px; }
.detail-sub  { font-size: 10px; color: #64748b; margin-bottom: 4px; }
.detail-meta { display: flex; flex-wrap: wrap; gap: 6px; font-size: 9px; color: #475569; align-items: center; }
.detail-meta i { font-size: 9px; }
.source-tag {
  padding: 1px 5px;
  border-radius: 3px;
  font-weight: 700;
  font-size: 8px;
  letter-spacing: 0.06em;
}
.src-acled     { background: rgba(239,68,68,0.15);  color: #ef4444; }
.src-ucdp      { background: rgba(245,158,11,0.15); color: #f59e0b; }
.src-gdelt     { background: rgba(99,102,241,0.15); color: #818cf8; }
.src-reliefweb { background: rgba(16,185,129,0.15); color: #34d399; }

.detail-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.stat-card {
  background: #111827;
  border: 1px solid #1e2d45;
  border-radius: 4px;
  padding: 6px 8px;
  text-align: center;
}
.stat-val { font-size: 13px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
.stat-lbl { font-size: 8px; color: #475569; text-transform: uppercase; margin-top: 2px; }

.text-red-400   { color: #f87171; }
.text-green-400 { color: #4ade80; }
.text-blue-400  { color: #60a5fa; }

.section {}
.section-label {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #334155;
  text-transform: uppercase;
  margin-bottom: 5px;
}

.actor-row { display: flex; align-items: center; gap: 8px; }
.actor {
  flex: 1;
  font-size: 9px;
  padding: 4px 6px;
  border-radius: 3px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.actor-a { background: rgba(239,68,68,0.1);  color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
.actor-b { background: rgba(59,130,246,0.1); color: #60a5fa; border: 1px solid rgba(59,130,246,0.2); }
.vs { font-size: 8px; color: #334155; flex-shrink: 0; }

.notes-text { font-size: 9px; color: #64748b; line-height: 1.5; }

.source-link {
  font-size: 9px;
  color: #3b82f6;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 5px;
}
.source-link:hover { color: #60a5fa; text-decoration: underline; }

.ctx-row {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
  font-size: 9px;
}
.ctx-key { color: #475569; }
.ctx-val { font-family: 'JetBrains Mono', monospace; font-weight: 700; }

.ai-brief-btn {
  width: 100%;
  padding: 8px;
  background: linear-gradient(135deg, rgba(59,130,246,0.15), rgba(168,85,247,0.15));
  border: 1px solid rgba(59,130,246,0.3);
  border-radius: 5px;
  color: #93c5fd;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.ai-brief-btn span {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ai-brief-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(59,130,246,0.25), rgba(168,85,247,0.25));
  border-color: rgba(59,130,246,0.5);
}
.ai-brief-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
