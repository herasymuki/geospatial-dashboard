<template>
  <div class="dashboard">
    <!-- ── Top Bar ─────────────────────────────────────────────────────────── -->
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

    <!-- ── Main Layout ─────────────────────────────────────────────────────── -->
    <div class="main-layout">
      <!-- Left sidebar — filters -->
      <FilterSidebar class="sidebar-col" />

      <!-- Centre — map views + timeline -->
      <div class="centre-col">
        <div class="map-area">
          <Transition name="view-fade" mode="out-in">
            <div v-if="store.activeView === 'globe'" key="globe" class="view-full">
              <GlobeView />
            </div>
            <div v-else-if="store.activeView === 'deck'" key="deck" class="view-full">
              <DeckMapView />
            </div>
            <div v-else-if="store.activeView === 'split'" key="split" class="view-split">
              <GlobeView   class="split-half" />
              <DeckMapView class="split-half" />
            </div>
          </Transition>
        </div>
        <div class="timeline-area">
          <TimelinePanel />
        </div>
      </div>

      <!-- Right panel — drill-down + AI -->
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
  { id: 'globe', label: '🌍 Globe'    },
  { id: 'deck',  label: '🗺 Deck Map' },
  { id: 'split', label: '⊞ Split'    },
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
  flex-shrink: 0;
}
.topbar-left, .topbar-right { display: flex; align-items: center; gap: 16px; }
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
.view-tab:hover  { color: #94a3b8; border-color: #1e2d45; }
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
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
  animation: pulse-anim 2s infinite;
}
@keyframes pulse-anim {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(1.3); }
}

/* ── Main Layout ── */
.main-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 200px 1fr 280px;
  grid-template-rows: 1fr;
  min-height: 0;
  overflow: hidden;
}

.sidebar-col {
  grid-column: 1;
  min-height: 0;
  overflow-y: auto;
}

.centre-col {
  grid-column: 2;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border-left: 1px solid #1e2d45;
  border-right: 1px solid #1e2d45;
}

.map-area {
  flex: 1;
  min-height: 0;
  position: relative;
}

.view-full {
  width: 100%;
  height: 100%;
}

.view-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 100%;
  height: 100%;
}
.split-half { min-width: 0; min-height: 0; }

.timeline-area {
  height: 140px;
  min-height: 140px;
  flex-shrink: 0;
  border-top: 1px solid #1e2d45;
}

.right-col {
  grid-column: 3;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

/* ── Loading overlay ── */
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10,14,26,0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 1000;
  backdrop-filter: blur(4px);
}
.loading-spinner {
  width: 36px;
  height: 36px;
  border: 2px solid #1e2d45;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.loading-overlay p { font-size: 12px; color: #64748b; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Transitions ── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.view-fade-enter-active, .view-fade-leave-active { transition: opacity 0.2s; }
.view-fade-enter-from, .view-fade-leave-to { opacity: 0; }
</style>
