<template>
  <div class="timeline-panel panel">
    <div class="panel-header">
      <span>📈</span> EVENT TIMELINE
      <div class="tl-tabs">
        <button
          v-for="m in metrics"
          :key="m.id"
          :class="['tl-tab', { active: activeMetric === m.id }]"
          @click="activeMetric = m.id"
        >{{ m.label }}</button>
      </div>
      <span class="ml-auto text-xs text-slate-500">{{ store.timelineData.length }} months</span>
    </div>
    <div class="chart-wrap">
      <Line v-if="chartData" :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Filler, Tooltip, Legend
} from 'chart.js'
import { useConflictsStore } from '@/stores/conflicts'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const store = useConflictsStore()
const activeMetric = ref('count')

const metrics = [
  { id: 'count',      label: 'Events' },
  { id: 'fatalities', label: 'Fatalities' },
]

const chartData = computed(() => {
  const tl = store.timelineData
  if (!tl.length) return null
  const labels = tl.map(d => d.date)
  const values = tl.map(d => d[activeMetric.value])
  const isCount = activeMetric.value === 'count'

  return {
    labels,
    datasets: [{
      label: isCount ? 'Events' : 'Fatalities',
      data: values,
      borderColor:     isCount ? '#3b82f6' : '#ef4444',
      backgroundColor: isCount ? 'rgba(59,130,246,0.08)' : 'rgba(239,68,68,0.08)',
      borderWidth: 1.5,
      pointRadius: 2,
      pointHoverRadius: 5,
      fill: true,
      tension: 0.4,
    }]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 300 },
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#111827',
      borderColor: '#1e2d45',
      borderWidth: 1,
      titleColor: '#94a3b8',
      bodyColor: '#e2e8f0',
      padding: 8,
    }
  },
  scales: {
    x: {
      grid: { color: 'rgba(30,45,69,0.5)', drawBorder: false },
      ticks: { color: '#475569', font: { size: 9 }, maxTicksLimit: 12 }
    },
    y: {
      grid: { color: 'rgba(30,45,69,0.5)', drawBorder: false },
      ticks: { color: '#475569', font: { size: 9 } }
    }
  }
}
</script>

<style scoped>
.timeline-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-bottom: none;
}
.tl-tabs { display: flex; gap: 4px; margin-left: 12px; }
.tl-tab {
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 10px;
  color: #475569;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
}
.tl-tab.active { color: #3b82f6; border-color: rgba(59,130,246,0.3); background: rgba(59,130,246,0.08); }
.chart-wrap { flex: 1; padding: 8px 12px; min-height: 0; }
</style>
