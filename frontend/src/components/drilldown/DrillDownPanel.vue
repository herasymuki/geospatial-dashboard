<template>
  <div class="drilldown panel">
    <div class="panel-header">
      <span>🔍</span> DRILL-DOWN
      <span v-if="event" class="ml-auto">
        <span :class="['badge', severityBadge]">{{ event.severity?.toUpperCase() }}</span>
      </span>
    </div>

    <div v-if="!event" class="empty-state">
      <div class="empty-icon">📍</div>
      <p>Click any event on the map or globe to inspect details</p>
    </div>

    <div v-else class="event-detail">
      <!-- Header -->
      <div class="detail-header">
        <div class="detail-type">{{ event.type }}</div>
        <div class="detail-sub">{{ event.subtype }}</div>
        <div class="detail-meta">
          <span>📅 {{ event.date }}</span>
          <span>🌍 {{ event.country }}</span>
          <span class="source-tag">{{ event.source }}</span>
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
      <div v-if="event.actor1 || event.actor2" class="actors-section">
        <div class="section-label">ACTORS</div>
        <div class="actor-row">
          <span class="actor actor-a">{{ event.actor1 || '—' }}</span>
          <span class="vs">vs</span>
          <span class="actor actor-b">{{ event.actor2 || '—' }}</span>
        </div>
      </div>

      <!-- Notes -->
      <div v-if="event.notes" class="notes-section">
        <div class="section-label">NOTES</div>
        <p class="notes-text">{{ event.notes?.slice(0, 300) }}{{ event.notes?.length > 300 ? '…' : '' }}</p>
      </div>

      <!-- Country summary -->
      <div v-if="countryStats" class="country-section">
        <div class="section-label">{{ event.country }} — TOTAL</div>
        <div class="country-stats">
          <span>{{ countryStats.count }} events</span>
          <span>{{ countryStats.fatalities.toLocaleString() }} fatalities</span>
        </div>
      </div>

      <!-- AI Analysis button -->
      <button class="ai-btn" @click="requestAI">
        <span>✦</span> AI Analysis
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
  return store.eventsByCountry[event.value.country]
})

function requestAI() {
  if (!event.value) return
  aiStore.analyzeConflict({
    event: event.value,
    countryStats: countryStats.value,
    totalEvents: store.stats.totalEvents
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
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 10px;
  color: #475569;
  font-size: 12px;
  text-align: center;
  padding: 20px;
}
.empty-icon { font-size: 28px; }

.event-detail { padding: 12px; }
.detail-header { margin-bottom: 12px; }
.detail-type { font-size: 13px; font-weight: 600; color: #e2e8f0; margin-bottom: 3px; }
.detail-sub  { font-size: 11px; color: #64748b; margin-bottom: 6px; }
.detail-meta { display: flex; flex-wrap: wrap; gap: 8px; font-size: 10px; color: #475569; }
.source-tag  { color: #3b82f6; }

.detail-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px; }
.stat-val { font-size: 16px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
.stat-lbl { font-size: 9px; color: #475569; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.06em; }

.section-label { font-size: 9px; font-weight: 600; letter-spacing: 0.1em; color: #475569; margin-bottom: 6px; text-transform: uppercase; }

.actors-section, .notes-section, .country-section { margin-bottom: 12px; }
.actor-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.actor { font-size: 11px; padding: 3px 8px; border-radius: 4px; }
.actor-a { background: rgba(239,68,68,0.1); color: #ef4444; }
.actor-b { background: rgba(59,130,246,0.1); color: #3b82f6; }
.vs { font-size: 10px; color: #475569; }

.notes-text { font-size: 11px; color: #64748b; line-height: 1.5; }

.country-stats { display: flex; gap: 12px; font-size: 11px; color: #94a3b8; }

.ai-btn {
  width: 100%;
  padding: 8px;
  background: rgba(59,130,246,0.1);
  border: 1px solid rgba(59,130,246,0.3);
  border-radius: 6px;
  color: #3b82f6;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s;
  margin-top: 4px;
}
.ai-btn:hover { background: rgba(59,130,246,0.2); }
</style>
