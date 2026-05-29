<template>
  <div class="dashboard">
    <!-- ── Top Navigation Bar ── -->
    <header class="topbar">
      <div class="topbar-left">
        <div class="logo">
          <span class="logo-icon"><i class="fa-solid fa-bolt"></i></span>
          <span class="logo-text">ATHENA</span>
          <span class="logo-sub">Global Conflicts Intelligence</span>
        </div>
      </div>
      <div class="topbar-center">
        <div class="stat-pill" v-for="stat in headerStats" :key="stat.label">
          <span class="stat-value" :class="stat.color">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
      </div>
      <div class="topbar-right">
        <div class="data-status">
          <span class="status-dot" :class="store.loading ? 'pulsing' : 'active'"></span>
          <span class="status-text">{{ store.loading ? 'Fetching live data...' : 'Live' }}</span>
        </div>
        <button class="refresh-btn" @click="store.fetchAll()" :disabled="store.loading">
          <i class="fa-solid fa-rotate-right" :class="{ spinning: store.loading }"></i> Refresh
        </button>
        <span class="last-updated" v-if="store.lastUpdated">
          Updated {{ formatTime(store.lastUpdated) }}
        </span>
      </div>
    </header>

    <!-- ── Error Banner ── -->
    <div class="error-banner" v-if="store.errors.length">
      <span><i class="fa-solid fa-triangle-exclamation"></i> Some data sources unavailable — showing cached/mock data:</span>
      <span v-for="e in store.errors" :key="e" class="error-item">{{ e }}</span>
    </div>

    <!-- ── Main Grid ── -->
    <main class="grid-layout" :class="{ 'panel-open': store.selectedConflict }">

      <!-- LEFT COLUMN -->
      <aside class="left-panel">
        <FilterPanel />
        <ConflictList />
        <NewsPanel />
      </aside>

      <!-- CENTER — Globe + Deck.gl -->
      <section class="center-panel">
        <div class="view-tabs">
          <button
            v-for="tab in viewTabs"
            :key="tab.id"
            class="tab-btn"
            :class="{ active: activeView === tab.id }"
            @click="activeView = tab.id"
          ><i :class="tab.icon"></i> {{ tab.label }}</button>
        </div>
        <GlobeView v-show="activeView === 'globe'" />
        <DeckMapView v-show="activeView === 'deck'" />
        <HeatmapView v-show="activeView === 'heatmap'" />
      </section>

      <!-- RIGHT COLUMN -->
      <aside class="right-panel">
        <StatsPanel />
        <TimelineChart />
        <EventTypeChart />
        <RegionBreakdown />
      </aside>

    </main>

    <!-- ── Detail Drawer ── -->
    <ConflictDetail v-if="store.selectedConflict" />

    <!-- ── Loading Overlay ── -->
    <div class="loading-overlay" v-if="store.loading && store.allEvents.length === 0">
      <div class="loader-content">
        <div class="loader-globe"><i class="fa-solid fa-earth-americas fa-spin"></i></div>
        <div class="loader-text">Fetching global conflict data...</div>
        <div class="loader-sources">
          <span v-for="src in dataSources" :key="src" class="source-tag">{{ src }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useConflictsStore } from "@/stores/conflicts";
import { format } from "date-fns";
import GlobeView from "@/components/GlobeView.vue";
import DeckMapView from "@/components/DeckMapView.vue";
import HeatmapView from "@/components/HeatmapView.vue";
import FilterPanel from "@/components/FilterPanel.vue";
import ConflictList from "@/components/ConflictList.vue";
import NewsPanel from "@/components/NewsPanel.vue";
import StatsPanel from "@/components/StatsPanel.vue";
import TimelineChart from "@/components/TimelineChart.vue";
import EventTypeChart from "@/components/EventTypeChart.vue";
import RegionBreakdown from "@/components/RegionBreakdown.vue";
import ConflictDetail from "@/components/ConflictDetail.vue";

const store = useConflictsStore();
const activeView = ref("globe");

const viewTabs = [
  { id: "globe",   label: "3D Globe",   icon: "fa-solid fa-earth-americas" },
  { id: "deck",    label: "Deck.gl Map", icon: "fa-solid fa-map" },
  { id: "heatmap", label: "Heatmap",    icon: "fa-solid fa-fire" },
];

function fmtBig(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1)+"M";
  if (n >= 1000)    return (n/1000).toFixed(0)+"K";
  return n.toLocaleString();
}

const headerStats = computed(() => [
  { label: "Countries",  value: store.activeConflictCount,               color: "text-red" },
  { label: "Events",     value: store.allEvents.length.toLocaleString(), color: "text-orange" },
  { label: "Fatalities", value: fmtBig(store.totalFatalities),           color: "text-red" },
  { label: "Refugees",   value: fmtBig(store.totalRefugees),             color: "text-yellow" },
  { label: "Sources",    value: "6 Live",                                color: "text-green" },
]);

function formatTime(iso) {
  try { return format(new Date(iso), "HH:mm:ss"); } catch { return ""; }
}
</script>
