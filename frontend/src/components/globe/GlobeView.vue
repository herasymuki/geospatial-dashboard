<template>
  <div ref="containerRef" class="globe-container">
    <div ref="globeEl" class="globe-el"></div>
    <div class="globe-controls">
      <button @click="resetCamera" title="Reset view">⌖</button>
      <button @click="toggleRotation" :class="{ active: rotating }">↻</button>
      <button @click="zoomIn">+</button>
      <button @click="zoomOut">−</button>
    </div>
    <div class="globe-legend">
      <div v-for="item in legend" :key="item.label" class="legend-item">
        <span class="legend-dot" :style="{ background: item.color }"></span>
        <span>{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useConflictsStore } from '@/stores/conflicts'

const store        = useConflictsStore()
const containerRef = ref(null)
const globeEl      = ref(null)
const rotating     = ref(true)
let   globeInstance = null

const legend = [
  { label: 'Battles',                    color: '#ef4444' },
  { label: 'Violence vs Civilians',      color: '#f59e0b' },
  { label: 'Explosions',                 color: '#eab308' },
  { label: 'Protests / Riots',           color: '#3b82f6' },
  { label: 'UCDP Armed Conflict',        color: '#f59e0b' },
  { label: 'GDELT Event',                color: '#06b6d4' },
]

onMounted(async () => {
  await nextTick()
  const GlobeGL = (await import('globe.gl')).default

  const w = containerRef.value.clientWidth
  const h = containerRef.value.clientHeight

  globeInstance = GlobeGL()(globeEl.value)
    .width(w)
    .height(h)
    .backgroundColor('#0a0e1a')
    // NASA Blue Marble textures
    .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
    .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
    // Atmosphere
    .showAtmosphere(true)
    .atmosphereColor('#1a3a6b')
    .atmosphereAltitude(0.18)
    // Points
    .pointsData(store.filteredEvents)
    .pointLat('lat')
    .pointLng('lng')
    .pointAltitude(d => Math.min(d.fatalities / 500, 0.15))
    .pointRadius(d => {
      const base = { critical: 0.6, high: 0.45, medium: 0.3, low: 0.18 }
      return base[d.severity] || 0.18
    })
    .pointColor(d => `rgba(${d.color.join(',')},0.85)`)
    .pointLabel(d => `
      <div style="background:#111827;border:1px solid #1e2d45;border-radius:6px;padding:10px 14px;font-family:Inter,sans-serif;font-size:12px;max-width:260px">
        <div style="font-weight:700;color:#e2e8f0;margin-bottom:6px">${d.type}</div>
        <div style="color:#64748b;font-size:11px;margin-bottom:4px">${d.country} · ${d.date}</div>
        <div style="color:#ef4444;font-size:11px;margin-bottom:4px">⚠ ${d.fatalities} fatalities</div>
        <div style="color:#94a3b8;font-size:10px">${d.actor1 || ''}${d.actor2 ? ' vs ' + d.actor2 : ''}</div>
        <div style="color:#475569;font-size:10px;margin-top:4px">Source: ${d.source}</div>
      </div>
    `)
    .onPointClick(d => store.selectEvent(d))
    // Arcs between high-severity events
    .arcsData(buildArcs(store.filteredEvents))
    .arcStartLat(d => d.startLat)
    .arcStartLng(d => d.startLng)
    .arcEndLat(d => d.endLat)
    .arcEndLng(d => d.endLng)
    .arcColor(d => d.color)
    .arcAltitude(0.3)
    .arcStroke(0.5)
    .arcDashLength(0.4)
    .arcDashGap(0.2)
    .arcDashAnimateTime(2000)
    // Heatmap rings
    .ringsData(store.filteredEvents.filter(e => e.severity === 'critical' || e.severity === 'high'))
    .ringLat('lat')
    .ringLng('lng')
    .ringMaxRadius(d => d.fatalities > 100 ? 4 : 2)
    .ringPropagationSpeed(1.5)
    .ringRepeatPeriod(800)
    .ringColor(() => t => `rgba(239,68,68,${1 - t})`)

  if (rotating.value) globeInstance.controls().autoRotate = true
  globeInstance.controls().autoRotateSpeed = 0.4

  // Resize observer
  const ro = new ResizeObserver(() => {
    if (containerRef.value) {
      globeInstance.width(containerRef.value.clientWidth)
      globeInstance.height(containerRef.value.clientHeight)
    }
  })
  ro.observe(containerRef.value)

  onUnmounted(() => { ro.disconnect(); globeInstance._destructor?.() })
})

watch(() => store.filteredEvents, (events) => {
  if (!globeInstance) return
  globeInstance
    .pointsData(events)
    .arcsData(buildArcs(events))
    .ringsData(events.filter(e => e.severity === 'critical' || e.severity === 'high'))
}, { deep: true })

function buildArcs(events) {
  const high = events.filter(e => e.severity === 'critical').slice(0, 60)
  const arcs = []
  for (let i = 0; i < high.length - 1; i += 2) {
    const a = high[i], b = high[i + 1]
    if (!a || !b) continue
    arcs.push({
      startLat: a.lat, startLng: a.lng,
      endLat:   b.lat, endLng:   b.lng,
      color:    ['rgba(239,68,68,0)', 'rgba(239,68,68,0.6)', 'rgba(239,68,68,0)']
    })
  }
  return arcs
}

function resetCamera() {
  globeInstance?.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 800)
}
function toggleRotation() {
  rotating.value = !rotating.value
  if (globeInstance) globeInstance.controls().autoRotate = rotating.value
}
function zoomIn()  { globeInstance?.camera().position.multiplyScalar(0.85) }
function zoomOut() { globeInstance?.camera().position.multiplyScalar(1.15) }
</script>

<style scoped>
.globe-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: #0a0e1a;
  overflow: hidden;
}
.globe-el { width: 100%; height: 100%; }

.globe-controls {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.globe-controls button {
  width: 28px; height: 28px;
  background: rgba(17,24,39,0.85);
  border: 1px solid #1e2d45;
  border-radius: 4px;
  color: #94a3b8;
  font-size: 14px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.globe-controls button:hover { border-color: #3b82f6; color: #3b82f6; }
.globe-controls button.active { border-color: #10b981; color: #10b981; }

.globe-legend {
  position: absolute;
  bottom: 12px;
  left: 12px;
  background: rgba(17,24,39,0.85);
  border: 1px solid #1e2d45;
  border-radius: 6px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 10px;
  color: #94a3b8;
}
.legend-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
