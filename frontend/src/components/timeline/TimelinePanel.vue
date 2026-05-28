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
      <div class="tl-tabs ml-2">
        <button
          v-for="t in chartTypes"
          :key="t.id"
          :class="['tl-tab', { active: activeChartType === t.id }]"
          @click="activeChartType = t.id"
        >{{ t.label }}</button>
      </div>
      <span class="ml-auto text-xs" style="color:#475569">
        {{ store.timelineData.length }} months · {{ store.stats.totalEvents.toLocaleString() }} events
      </span>
    </div>
    <div class="chart-wrap">
      <component
        :is="activeChartType === 'bar' ? Bar : Line"
        v-if="chartData"
        :data="chartData"
        :options="chartOptions"
      />
      <div v-else class="no-data">No timeline data — adjust filters or refresh data.</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Bar, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Filler, Tooltip, Legend
} from 'chart.js'
import { useConflictsStore } from '@/stores/conflicts'

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Filler, Tooltip, Legend
)

const store           = useConflictsStore()
const activeMetric    = ref('count')
const activeChartType = ref('line')

const metrics = [
  { id: 'count',      label: 'Events'     },
  { id: 'fatalities', label: 'Fatalities' },
]
const chartTypes = [
  { id: 'line', label: '〜 Line' },
  { id: 'bar',  label: '▌ Bar'  },
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
      label:           isCount ? 'Events' : 'Fatalities',
      data:            values,
      borderColor:     isCount ? '#3b82f6' : '#ef4444',
      backgroundColor: isCount
        ? (activeChartType.value === 'bar' ? 'rgba(59,130,246,0.4)' : 'rgba(59,130,246,0.07)')
        : (activeChartType.value === 'bar' ? 'rgba(239,68,68,0.4)'  : 'rgba(239,68,68,0.07)'),
      borderWidth:     activeChartType.value === 'bar' ? 0 : 1.5,
      pointRadius:     activeChartType.value === 'bar' ? 0 : 2,
      pointHoverRadius: 5,
      fill:            activeChartType.value === 'line',
      tension:         0.4,
      borderRadius:    activeChartType.value === 'bar' ? 2 : 0,
    }]
  }
})

const chartOptions = computed(() => ({
  responsive:           true,
  maintainAspectRatio:  false,
  animation:            { duration: 250 },
  interaction:          { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#111827',
      borderColor:     '#1e2d45',
      borderWidth:     1,
      titleColor:      '#94a3b8',
      bodyColor:       '#e2e8f0',
      padding:         8,
      callbacks: {
        label: ctx => ` ${ctx.parsed.y.toLocaleString()} ${activeMetric.value === 'count' ? 'events' : 'fatalities'}`
      }
    }
  },
  scales: {
    x: {
      grid:  { color: 'rgba(30,45,69,0.4)', drawBorder: false },
      ticks: { color: '#475569', font: { size: 9 }, maxTicksLimit: 14 }
    },
    y: {
      grid:  { color: 'rgba(30,45,69,0.4)', drawBorder: false },
      ticks: { color: '#475569', font: { size: 9 },
               callback: v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v }
    }
  }
}))
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
.tl-tabs { display: flex; gap: 3px; margin-left: 10px; }
.tl-tab {
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 10px;
  color: #475569;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.12s;
}
.tl-tab:hover { color: #94a3b8; }
.tl-tab.active {
  color: #3b82f6;
  border-color: rgba(59,130,246,0.3);
  background: rgba(59,130,246,0.08);
}
.chart-wrap {
  flex: 1;
  padding: 6px 12px 8px;
  min-height: 0;
  position: relative;
}
.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 11px;
  color: #475569;
}
</style>
