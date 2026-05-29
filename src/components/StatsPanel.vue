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

function fmt(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000)    return (n / 1000).toFixed(0) + "K";
  return n.toLocaleString();
}

const stats = computed(() => [
  { icon: "fa-solid fa-earth-americas",      label: "Countries Affected",  value: store.activeConflictCount,                                     color: "text-red" },
  { icon: "fa-solid fa-shield-halved",       label: "Total Events",        value: store.allEvents.length.toLocaleString(),                        color: "text-orange" },
  { icon: "fa-solid fa-skull",               label: "Total Fatalities",    value: fmt(store.totalFatalities),                                     color: "text-red" },
  { icon: "fa-solid fa-person-walking-arrow-right", label: "Refugees",     value: fmt(store.totalRefugees),                                       color: "text-yellow" },
  { icon: "fa-solid fa-house-crack",         label: "IDPs",                value: fmt(store.totalIDPs),                                           color: "text-orange" },
  { icon: "fa-solid fa-circle-exclamation",  label: "Critical Events",     value: store.allEvents.filter(e => e.severity === "critical").length,  color: "text-red" },
  { icon: "fa-solid fa-satellite-dish",      label: "GDELT Articles",      value: store.gdeltEvents.length,                                       color: "text-green" },
  { icon: "fa-solid fa-newspaper",           label: "News Items",          value: store.newsItems.length,                                         color: "text-blue" },
]);

const dataSources = computed(() => [
  { name: "UCDP",      count: `${store.ucdpConflicts.length} events`,    status: store.ucdpConflicts.length > 0 ? "ok" : "err" },
  { name: "GDELT",     count: `${store.gdeltEvents.length} articles`,    status: store.gdeltEvents.length > 0 ? "ok" : "err" },
  { name: "GDACS",     count: `${store.gdacsAlerts.length} alerts`,      status: store.gdacsAlerts.length > 0 ? "ok" : "err" },
  { name: "Wikidata",  count: `${store.wikidataConflicts.length} conflicts`, status: store.wikidataConflicts.length > 0 ? "ok" : "err" },
  { name: "UNHCR",     count: `${store.unhcrFlows.arcs?.length || 0} flows`, status: (store.unhcrFlows.arcs?.length || 0) > 0 ? "ok" : "err" },
  { name: "RSS Feeds", count: `${store.newsItems.length} items`,         status: store.newsItems.length > 0 ? "ok" : "err" },
]);
</script>

<style scoped>
.stats-panel { display: flex; flex-direction: column; gap: 12px; }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.stat-card {
  background: #0f172a; border: 1px solid #1e293b; border-radius: 6px;
  padding: 10px 8px; text-align: center;
}
.stat-icon { font-size: 14px; color: #475569; margin-bottom: 4px; }
.stat-number { font-size: 18px; font-weight: 700; font-family: monospace; }
.stat-desc { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
.text-red    { color: #ef4444; }
.text-orange { color: #f97316; }
.text-yellow { color: #f59e0b; }
.text-green  { color: #22c55e; }
.text-blue   { color: #3b82f6; }
.data-sources-status { border-top: 1px solid #1e293b; padding-top: 10px; }
.data-sources-status h4 { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
.source-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 11px; }
.source-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.dot-green { background: #22c55e; box-shadow: 0 0 4px #22c55e; }
.dot-red   { background: #ef4444; box-shadow: 0 0 4px #ef4444; }
.source-name { flex: 1; color: #94a3b8; }
.source-count { color: #64748b; font-size: 10px; }
</style>
