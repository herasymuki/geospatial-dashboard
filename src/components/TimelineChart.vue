<template>
  <div class="panel chart-panel">
    <h3 class="panel-title"><i class="fa-solid fa-chart-line"></i> Events Timeline</h3>
    <div class="chart-wrapper">
      <Line v-if="chartData.labels.length" :data="chartData" :options="chartOptions" />
      <div v-else class="chart-empty">Loading timeline data...</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { Line } from "vue-chartjs";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from "chart.js";
import { useConflictsStore } from "@/stores/conflicts";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const store = useConflictsStore();

const chartData = computed(() => {
  const months = store.eventsByMonth.slice(-12);
  return {
    labels: months.map(m => m.month),
    datasets: [
      {
        label: "Events",
        data: months.map(m => m.events),
        borderColor: "#00e5ff",
        backgroundColor: "rgba(0,229,255,0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        yAxisID: "y",
      },
      {
        label: "Fatalities",
        data: months.map(m => m.fatalities),
        borderColor: "#ff1744",
        backgroundColor: "rgba(255,23,68,0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        yAxisID: "y1",
      }
    ]
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { labels: { color: "#8899aa", font: { size: 11 } } },
    tooltip: {
      backgroundColor: "#0d1b2a",
      borderColor: "#1e3a5f",
      borderWidth: 1,
      titleColor: "#ffffff",
      bodyColor: "#8899aa",
    }
  },
  scales: {
    x: { ticks: { color: "#556677", font: { size: 10 } }, grid: { color: "#0d1b2a" } },
    y: {
      type: "linear", position: "left",
      ticks: { color: "#00e5ff", font: { size: 10 } },
      grid: { color: "#0d1b2a" }
    },
    y1: {
      type: "linear", position: "right",
      ticks: { color: "#ff1744", font: { size: 10 } },
      grid: { drawOnChartArea: false }
    }
  }
};
</script>
