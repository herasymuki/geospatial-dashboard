<template>
  <div class="panel chart-panel">
    <h3 class="panel-title">🎯 Event Types</h3>
    <div class="chart-wrapper">
      <Doughnut v-if="chartData.labels.length" :data="chartData" :options="chartOptions" />
      <div v-else class="chart-empty">Loading...</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { Doughnut } from "vue-chartjs";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useConflictsStore } from "@/stores/conflicts";

ChartJS.register(ArcElement, Tooltip, Legend);

const store = useConflictsStore();

const COLORS = ["#ff1744","#ff6d00","#ffd600","#00e5ff","#00bfa5","#aa00ff","#2979ff","#76ff03"];

const chartData = computed(() => {
  const types = store.eventsByType.slice(0, 8);
  return {
    labels: types.map(t => t.type),
    datasets: [{
      data: types.map(t => t.count),
      backgroundColor: COLORS.map(c => c + "cc"),
      borderColor: COLORS,
      borderWidth: 1,
      hoverOffset: 8,
    }]
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "65%",
  plugins: {
    legend: {
      position: "bottom",
      labels: { color: "#8899aa", font: { size: 10 }, padding: 8, boxWidth: 12 }
    },
    tooltip: {
      backgroundColor: "#0d1b2a",
      borderColor: "#1e3a5f",
      borderWidth: 1,
      titleColor: "#ffffff",
      bodyColor: "#8899aa",
    }
  }
};
</script>
