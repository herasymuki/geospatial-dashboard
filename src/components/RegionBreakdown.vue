<template>
  <div class="panel chart-panel">
    <h3 class="panel-title">🌐 Top Conflict Zones</h3>
    <div class="region-list">
      <div v-for="(c, i) in store.topConflicts" :key="c.country" class="region-row"
           @click="store.selectConflict(store.allEvents.find(e => e.country === c.country))">
        <span class="region-rank">#{{ i + 1 }}</span>
        <div class="region-info">
          <div class="region-name">{{ c.country }}</div>
          <div class="region-bar-wrap">
            <div class="region-bar" :style="{ width: barWidth(c.fatalities) + '%', background: barColor(i) }"></div>
          </div>
        </div>
        <div class="region-stats">
          <span class="region-fatal">{{ c.fatalities.toLocaleString() }}</span>
          <span class="region-events">{{ c.events }} ev.</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useConflictsStore } from "@/stores/conflicts";

const store = useConflictsStore();

const maxFatalities = computed(() =>
  Math.max(...store.topConflicts.map(c => c.fatalities), 1)
);

function barWidth(f) { return Math.max(4, (f / maxFatalities.value) * 100); }

const BAR_COLORS = ["#ff1744","#ff3d00","#ff6d00","#ff9100","#ffab00","#ffd600","#c6ff00","#76ff03","#00e5ff","#00b0ff"];
function barColor(i) { return BAR_COLORS[i] || "#00e5ff"; }
</script>
