<template>
  <div class="panel conflict-list-panel">
    <h3 class="panel-title"><i class="fa-solid fa-circle-exclamation" style="color:#ef4444"></i> Active Conflicts
      <span class="badge">{{ store.conflictsByCountry.length }}</span>
    </h3>
    <div class="search-box">
      <input v-model="search" placeholder="Search country..." class="search-input" />
    </div>
    <div class="conflict-list">
      <div
        v-for="c in filteredConflicts"
        :key="c.country"
        class="conflict-item"
        :class="{ selected: store.selectedConflict?.country === c.country }"
        @click="selectCountry(c)"
      >
        <div class="ci-left">
          <span class="ci-severity" :class="getSeverityClass(c.fatalities)">●</span>
          <div>
            <div class="ci-country">{{ c.country }}</div>
            <div class="ci-events">{{ c.events }} events</div>
          </div>
        </div>
        <div class="ci-right">
          <div class="ci-fatalities">{{ c.fatalities.toLocaleString() }}</div>
          <div class="ci-label">fatalities</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useConflictsStore } from "@/stores/conflicts";

const store = useConflictsStore();
const search = ref("");

const filteredConflicts = computed(() =>
  store.conflictsByCountry.filter(c =>
    c.country.toLowerCase().includes(search.value.toLowerCase())
  )
);

function getSeverityClass(fatalities) {
  if (fatalities >= 1000) return "sev-critical";
  if (fatalities >= 100)  return "sev-high";
  if (fatalities >= 10)   return "sev-medium";
  return "sev-low";
}

function selectCountry(c) {
  const event = store.allEvents.find(e => e.country === c.country);
  if (event) store.selectConflict(event);
}
</script>
