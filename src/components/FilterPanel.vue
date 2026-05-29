<template>
  <div class="panel filter-panel">
    <h3 class="panel-title"><i class="fa-solid fa-sliders"></i> Filters</h3>

    <!-- Event Types -->
    <div class="filter-group">
      <label class="filter-label">Event Types</label>
      <div class="filter-chips">
        <button
          v-for="type in store.availableTypes"
          :key="type"
          class="chip"
          :class="{ active: store.filterTypes.includes(type) }"
          @click="toggleType(type)"
        >{{ type }}</button>
      </div>
    </div>

    <!-- Data Sources -->
    <div class="filter-group">
      <label class="filter-label">Data Sources</label>
      <div class="filter-chips">
        <button
          v-for="src in store.availableSources"
          :key="src"
          class="chip"
          :class="{ active: store.filterSources.includes(src) }"
          @click="toggleSource(src)"
        >{{ src }}</button>
      </div>
    </div>

    <!-- Regions -->
    <div class="filter-group">
      <label class="filter-label">Regions</label>
      <div class="filter-chips">
        <button
          v-for="region in store.availableRegions"
          :key="region"
          class="chip"
          :class="{ active: store.filterRegions.includes(region) }"
          @click="toggleRegion(region)"
        >{{ region }}</button>
      </div>
    </div>

    <!-- Min Fatalities -->
    <div class="filter-group">
      <label class="filter-label">
        Min. Fatalities: <strong>{{ store.filterMinFatalities.toLocaleString() }}</strong>
      </label>
      <input
        type="range" min="0" max="50000" step="100"
        :value="store.filterMinFatalities"
        @input="store.filterMinFatalities = parseInt($event.target.value)"
        class="range-input"
      />
    </div>

    <!-- Date Range -->
    <div class="filter-group">
      <label class="filter-label">Date Range</label>
      <div class="date-inputs">
        <input type="date" :value="store.filterDateFrom" @change="store.filterDateFrom = $event.target.value" class="date-input" />
        <span style="color:#64748b">→</span>
        <input type="date" :value="store.filterDateTo" @change="store.filterDateTo = $event.target.value" class="date-input" />
      </div>
    </div>

    <!-- Active filter count + Reset -->
    <div class="filter-footer">
      <span class="filter-count" v-if="activeFilterCount > 0">
        <i class="fa-solid fa-circle-dot" style="color:#f59e0b"></i>
        {{ activeFilterCount }} filter{{ activeFilterCount > 1 ? "s" : "" }} active
        — {{ store.allEvents.length }} / {{ store.allEventsRaw.length }} events shown
      </span>
      <button class="reset-filters-btn" @click="store.resetFilters()">
        <i class="fa-solid fa-rotate-left"></i> Reset
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useConflictsStore } from "@/stores/conflicts";

const store = useConflictsStore();

function toggleType(t) {
  const i = store.filterTypes.indexOf(t);
  if (i > -1) store.filterTypes.splice(i, 1);
  else store.filterTypes.push(t);
}
function toggleSource(s) {
  const i = store.filterSources.indexOf(s);
  if (i > -1) store.filterSources.splice(i, 1);
  else store.filterSources.push(s);
}
function toggleRegion(r) {
  const i = store.filterRegions.indexOf(r);
  if (i > -1) store.filterRegions.splice(i, 1);
  else store.filterRegions.push(r);
}

const activeFilterCount = computed(() =>
  store.filterTypes.length +
  store.filterSources.length +
  store.filterRegions.length +
  (store.filterMinFatalities > 0 ? 1 : 0) +
  (store.filterDateFrom !== "2010-01-01" ? 1 : 0)
);
</script>

<style scoped>
.filter-panel { display: flex; flex-direction: column; gap: 12px; }
.filter-group { display: flex; flex-direction: column; gap: 6px; }
.filter-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
.filter-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.chip {
  padding: 3px 8px; border-radius: 4px; border: 1px solid #334155;
  background: #0f172a; color: #94a3b8; font-size: 10px; cursor: pointer;
  transition: all 0.15s;
}
.chip:hover { border-color: #3b82f6; color: #e2e8f0; }
.chip.active { background: #1e3a5f; border-color: #3b82f6; color: #60a5fa; }
.range-input { width: 100%; accent-color: #3b82f6; }
.date-inputs { display: flex; align-items: center; gap: 6px; }
.date-input {
  flex: 1; padding: 4px 6px; background: #0f172a; border: 1px solid #334155;
  border-radius: 4px; color: #e2e8f0; font-size: 11px;
}
.filter-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.filter-count { font-size: 10px; color: #94a3b8; }
.reset-filters-btn {
  padding: 5px 10px; background: #1e293b; border: 1px solid #334155;
  border-radius: 4px; color: #94a3b8; font-size: 11px; cursor: pointer;
  transition: all 0.15s;
}
.reset-filters-btn:hover { border-color: #ef4444; color: #ef4444; }
</style>
