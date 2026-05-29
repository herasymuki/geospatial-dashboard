<template>
  <div class="panel stats-panel">
    <h3 class="panel-title"><i class="fa-solid fa-chart-bar"></i> Global Statistics</h3>
    <div class="stats-grid">
      <div v-for="stat in stats" :key="stat.label" class="stat-card">
        <div class="stat-icon"><i :class="stat.icon"></i></div>
        <div class="stat-number" :class="stat.color">{{ stat.value }}</div>
        <div class="stat-desc">{{ stat.label }}</div>
      </div>
    </div>
    <div class="data-sources-status">
      <h4>Data Sources</h4>
      <div v-for="src in dataSources" :key="src.name" class="source-row">
        <span class="source-dot" :class="src.status === 'ok' ? 'dot-green' : 'dot-red'"></span>
        <span class="source-name">{{ src.name }}</span>
        <span class="source-count">{{ src.count }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useConflictsStore } from "@/stores/conflicts";

const store = useConflictsStore();

const stats = computed(() => [
  { icon: "fa-solid fa-earth-americas", label: "Countries Affected",  value: store.activeConflictCount, color: "text-red" },
  { icon: "fa-solid fa-shield-halved",  label: "Total Events",        value: store.allEvents.length.toLocaleString(), color: "text-orange" },
  { icon: "fa-solid fa-skull",  label: "Total Fatalities",    value: store.totalFatalities.toLocaleString(), color: "text-red" },
  { icon: "fa-solid fa-newspaper",  label: "News Articles",       value: store.newsItems.length, color: "text-blue" },
  { icon: "fa-solid fa-circle-exclamation",  label: "Critical Events",     value: store.allEvents.filter(e => e.severity === "critical").length, color: "text-red" },
  { icon: "fa-solid fa-satellite-dish",  label: "GDELT Articles",      value: store.gdeltEvents.length, color: "text-green" },
]);

const dataSources = computed(() => [
  { name: "ACLED",      count: `${store.acledEvents.length} events`,   status: store.acledEvents.length > 0 ? "ok" : "err" },
  { name: "UCDP",       count: `${store.ucdpConflicts.length} records`, status: store.ucdpConflicts.length > 0 ? "ok" : "err" },
  { name: "GDELT",      count: `${store.gdeltEvents.length} articles`,  status: store.gdeltEvents.length > 0 ? "ok" : "err" },
  { name: "ReliefWeb",  count: `${store.reliefCrises.length} crises`,   status: store.reliefCrises.length > 0 ? "ok" : "err" },
  { name: "RSS Feeds",  count: `${store.newsItems.length} items`,       status: store.newsItems.length > 0 ? "ok" : "err" },
]);
</script>
