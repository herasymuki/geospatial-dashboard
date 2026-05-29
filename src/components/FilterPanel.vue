<template>
  <div class="panel filter-panel">
    <h3 class="panel-title">🔍 Filters</h3>
    <div class="filter-group">
      <label class="filter-label">Event Types</label>
      <div class="filter-chips">
        <button
          v-for="type in eventTypes"
          :key="type"
          class="chip"
          :class="{ active: selectedTypes.includes(type) }"
          @click="toggleType(type)"
        >{{ type }}</button>
      </div>
    </div>
    <div class="filter-group">
      <label class="filter-label">Data Sources</label>
      <div class="filter-chips">
        <button
          v-for="src in sources"
          :key="src"
          class="chip"
          :class="{ active: selectedSources.includes(src) }"
          @click="toggleSource(src)"
        >{{ src }}</button>
      </div>
    </div>
    <div class="filter-group">
      <label class="filter-label">Min. Fatalities: {{ minFatalities }}</label>
      <input type="range" min="0" max="500" v-model.number="minFatalities" class="range-input" />
    </div>
    <div class="filter-group">
      <label class="filter-label">Date Range</label>
      <div class="date-inputs">
        <input type="date" v-model="dateFrom" class="date-input" />
        <span>→</span>
        <input type="date" v-model="dateTo" class="date-input" />
      </div>
    </div>
    <button class="reset-filters-btn" @click="resetFilters">↺ Reset Filters</button>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useConflictsStore } from "@/stores/conflicts";

const store = useConflictsStore();
const selectedTypes   = ref([]);
const selectedSources = ref([]);
const minFatalities   = ref(0);
const dateFrom        = ref("2020-01-01");
const dateTo          = ref(new Date().toISOString().slice(0,10));

const eventTypes = computed(() => [...new Set(store.allEvents.map(e => e.type))].slice(0, 8));
const sources    = ["ACLED", "UCDP"];

function toggleType(t) {
  const i = selectedTypes.value.indexOf(t);
  if (i > -1) selectedTypes.value.splice(i, 1);
  else selectedTypes.value.push(t);
}

function toggleSource(s) {
  const i = selectedSources.value.indexOf(s);
  if (i > -1) selectedSources.value.splice(i, 1);
  else selectedSources.value.push(s);
}

function resetFilters() {
  selectedTypes.value   = [];
  selectedSources.value = [];
  minFatalities.value   = 0;
  dateFrom.value        = "2020-01-01";
  dateTo.value          = new Date().toISOString().slice(0,10);
}
</script>
