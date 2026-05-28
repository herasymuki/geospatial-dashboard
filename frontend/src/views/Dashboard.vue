<template>
  <div class="dashboard">
    <!-- ── Top Bar ──────────────────────────────────────────────────── -->
    <header class="topbar">
      <div class="topbar-left">
        <div class="logo">
          <span class="logo-icon">⚔</span>
          <span class="logo-text">ATHENA <span class="logo-sub">GLOBAL CONFLICTS</span></span>
        </div>
        <div class="view-tabs">
          <button
            v-for="v in views"
            :key="v.id"
            :class="['view-tab', { active: store.activeView === v.id }]"
            @click="store.setActiveView(v.id)"
          >{{ v.label }}</button>
        </div>
      </div>
      <div class="topbar-right">
        <StatBar />
        <div class="live-badge">
          <span class="pulse"></span> LIVE
        </div>
      </div>
    </header>

    <!-- ── Main Layout ──────────────────────────────────────────────── -->
    <div class="main-layout">
      <!-- Sidebar -->
      <FilterSidebar class="sidebar-col" />

      <!-- Centre — Globe / Deck / Split -->
      <div class="centre-col">
        <div v-if="store.activeView === 'globe'" class="view-full">
          <GlobeView />
        </div>
        <div v-else-if="store.activeView === 'deck'" class="view-full">
          <DeckMapView />
        </div>
        <div v-else-if="store.activeView === 'split'" class="view-split">
          <GlobeView class="split-half" />
          <DeckMapView class="split-half" />
        </div>

        <!-- Timeline always visible below map -->
        <TimelinePanel class="timeline-strip" />
      </div>

      <!-- Right Panel — Drill-down + AI -->
      <div class="right-col">
        <DrillDownPanel />
        <AIPanel />
      </div>
    </div>

    <!-- Loading overlay -->
    <Transition name="fade">
      <div v-if="store.loading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p>Fetching live conflict data…</p>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { useConflictsStore } from '@/stores/conflicts'
import StatBar        from '@/components/ui/StatBar.vue'
import FilterSidebar  from '@/components/sidebar/FilterSidebar.vue'
import GlobeView      from '@/components/globe/GlobeView.vue'
import DeckMapView    from '@/components/deckmap/DeckMapView.vue'
import TimelinePanel  from '@/components/timeline/TimelinePanel.vue'
import DrillDownPanel from '@/components/drilldown/DrillDownPanel.vue'
import AIPanel        from '@/components/ui/AIPanel.vue'

const store = useConflictsStore()
const views = [
  { id: 'globe', label: '🌍 Globe' },
  { id: 'deck',  label: '🗺 Deck Map' },
  { id: 'split', label: '⊞ Split' }
]
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #0a0e1a;
}

/* ── Top Bar ── */
.topbar {
  height: 52px;
  min-height: 52px;
  background: #0d1424;
  border-bottom: 1px solid #1e2d45;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 100;
}

.topbar-left, .topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo { display: flex; align-items: center; gap: 8px; }
.logo-icon { font-size: 18px; }
.logo-text {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #e2e8f0;
}
.logo-sub {
  font-size: 10px;
  font-weight: 400;
  color: #3b82f6;
  margin-left: 6px;
  letter-spacing: 0.15em;
}

.view-tabs { display: flex; gap: 4px; }
.view-tab {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #64748b;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
}
.view-tab:hover { color: #94a3b8; border-color: #1e2d45; }
.view-tab.active { color: #3b82f6; background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.3); }

.live-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #10b981;
}
.pulse {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: #10b981;
  animation: pulse 1.5s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(1.4); }
}

/* ── Main Layout ── */
.main-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 220px 1fr 300px;
  overflow: hidden;
}

.sidebar-col { overflow-y: auto; border-right: 1px solid #1e2d45; }

.centre-col {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.view-full { flex: 1; min-height: 0; }

.view-split {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.split-half { min-height: 0; }

.timeline-strip {
  height: 160px;
  min-height: 160px;
  border-top: 1px solid #1e2d45;
}

.right-col {
  display: flex;
  flex-direction: column;
  border-left: 1px solid #1e2d45;
  overflow: hidden;
}

/* ── Loading ── */
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10,14,26,0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  gap: 16px;
  font-size: 13px;
  color: #64748b;
}
.loading-spinner {
  width: 40px; height: 40px;
  border: 3px solid #1e2d45;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
