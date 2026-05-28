<template>
  <div ref="containerRef" class="globe-container">
    <div ref="globeEl" class="globe-el"></div>

    <!-- Controls -->
    <div class="globe-controls">
      <button @click="resetCamera" title="Reset view" class="ctrl-btn">⌖</button>
      <button @click="toggleRotation" :class="['ctrl-btn', { active: rotating }]" title="Auto-rotate">↻</button>
      <button @click="zoomIn"  class="ctrl-btn" title="Zoom in">+</button>
      <button @click="zoomOut" class="ctrl-btn" title="Zoom out">−</button>
      <button @click="toggleHeatRings" :class="['ctrl-btn', { active: showRings }]" title="Pulse rings">◎</button>
      <button @click="toggleArcs"      :class="['ctrl-btn', { active: showArcs }]"  title="Conflict arcs">↗</button>
    </div>

    <!-- Layer legend -->
    <div class="globe-legend">
      <div v-for="item in legend" :key="item.label" class="legend-item">
        <span class="legend-dot" :style="{ background: item.color }"></span>
        <span>{{ item.label }}</span>
        <span class="legend-count">{{ item.count }}</span>
      </div>
    </div>

    <!-- Hover tooltip -->
    <div v-if="hoveredEvent" class="globe-tooltip"
         :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }">
      <div class="tt-type">{{ hoveredEvent.type }}</div>
      <div class="tt-country">{{ hoveredEvent.country }} · {{ hoveredEvent.date }}</div>
      <div class="tt-fatal" v-if="hoveredEvent.fatalities > 0">
        ⚠ {{ hoveredEvent.fatalities.toLocaleString() }} fatalities
      </div>
      <div class="tt-actors" v-if="hoveredEvent.actor1">
        {{ hoveredEvent.actor1 }}{{ hoveredEvent.actor2 ? ' vs ' + hoveredEvent.actor2 : '' }}
      </div>
      <div class="tt-source">{{ hoveredEvent.source }}</div>
    </div>

    <!-- Stats overlay -->
    <div class="globe-stats">
      <span class="gs-item">
        <span class="gs-val text-blue-400">{{ store.stats.totalEvents.toLocaleString() }}</span>
        <span class="gs-lbl">events</span>
      </span>
      <span class="gs-sep">·</span>
      <span class="gs-item">
        <span class="gs-val text-red-400">{{ store.stats.totalFatalities.toLocaleString() }}</span>
        <span class="gs-lbl">fatalities</span>
      </span>
      <span class="gs-sep">·</span>
      <span class="gs-item">
        <span class="gs-val text-amber-400">{{ store.stats.countries }}</span>
        <span class="gs-lbl">countries</span>
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, computed, reactive } from 'vue'
import { useConflictsStore } from '@/stores/conflicts'

const store        = useConflictsStore()
const containerRef = ref(null)
const globeEl      = ref(null)
const rotating     = ref(true)
const showRings    = ref(true)
const showArcs     = ref(true)
const hoveredEvent = ref(null)
const tooltipPos   = reactive({ x: 0, y: 0 })
let   globeInstance = null
let   roObserver    = null

const legend = computed(() => {
  const evts = store.filteredEvents
  const counts = {}
  evts.forEach(e => { counts[e.type] = (counts[e.type] || 0) + 1 })
  const colorMap = {
    'Battles':                    '#ef4444',
    'Violence against civilians': '#f59e0b',
    'Explosions/Remote violence': '#eab308',
    'Protests':                   '#3b82f6',
    'Riots':                      '#a855f7',
    'Strategic developments':     '#10b981',
    'Armed Conflict':             '#f59e0b',
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, count]) => ({
      label,
      count,
      color: colorMap[label] || '#64748b'
    }))
})

function buildArcs(events) {
  const high = events.filter(e => e.severity === 'critical' || e.severity === 'high')
  const arcs = []
  for (let i = 0; i < Math.min(high.length - 1, 60); i++) {
    const a = high[i], b = high[(i + 3) % high.length]
    if (!a || !b) continue
    if (Math.abs(a.lat - b.lat) < 0.5 && Math.abs(a.lng - b.lng) < 0.5) continue
    arcs.push({
      startLat: a.lat, startLng: a.lng,
      endLat:   b.lat, endLng:   b.lng,
      color:    ['rgba(239,68,68,0.7)', 'rgba(245,158,11,0.5)'],
    })
  }
  return arcs
}

onMounted(async () => {
  await nextTick()
  const GlobeGL = (await import('globe.gl')).default

  const w = containerRef.value?.clientWidth  || 800
  const h = containerRef.value?.clientHeight || 600

  globeInstance = GlobeGL()(globeEl.value)
    .width(w).height(h)
    .backgroundColor('#0a0e1a')
    // ── NASA textures ──────────────────────────────────────────────────────
    .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
    .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
    // ── Atmosphere ─────────────────────────────────────────────────────────
    .showAtmosphere(true)
    .atmosphereColor('#1a3a6b')
    .atmosphereAltitude(0.18)
    // ── Points ─────────────────────────────────────────────────────────────
    .pointsData(store.filteredEvents)
    .pointLat('lat')
    .pointLng('lng')
    .pointAltitude(d => {
      const base = { critical: 0.12, high: 0.08, medium: 0.04, low: 0.01 }
      return base[d.severity] || 0.01
    })
    .pointRadius(d => {
      const base = { critical: 0.55, high: 0.4, medium: 0.28, low: 0.16 }
      return base[d.severity] || 0.16
    })
    .pointColor(d => `rgba(${d.color[0]},${d.color[1]},${d.color[2]},0.88)`)
    .pointsMerge(false)
    .onPointHover((d, evt) => {
      hoveredEvent.value = d || null
      if (evt && d) {
        tooltipPos.x = evt.clientX - (containerRef.value?.getBoundingClientRect().left || 0) + 14
        tooltipPos.y = evt.clientY - (containerRef.value?.getBoundingClientRect().top  || 0) + 14
      }
    })
    .onPointClick(d => { if (d) store.selectEvent(d) })
    // ── Arcs ───────────────────────────────────────────────────────────────
    .arcsData(showArcs.value ? buildArcs(store.filteredEvents) : [])
    .arcStartLat('startLat').arcStartLng('startLng')
    .arcEndLat('endLat').arcEndLng('endLng')
    .arcColor('color')
    .arcAltitude(0.25)
    .arcStroke(0.4)
    .arcDashLength(0.35)
    .arcDashGap(0.15)
    .arcDashAnimateTime(2500)
    // ── Pulse rings ────────────────────────────────────────────────────────
    .ringsData(showRings.value
      ? store.filteredEvents.filter(e => e.severity === 'critical')
      : [])
    .ringLat('lat').ringLng('lng')
    .ringMaxRadius(d => d.fatalities > 200 ? 5 : 3)
    .ringPropagationSpeed(1.8)
    .ringRepeatPeriod(700)
    .ringColor(() => t => `rgba(239,68,68,${(1 - t) * 0.8})`)

  globeInstance.controls().autoRotate      = rotating.value
  globeInstance.controls().autoRotateSpeed = 0.35
  globeInstance.controls().enableZoom      = true
  globeInstance.pointOfView({ lat: 20, lng: 10, altitude: 2.2 }, 0)

  // Resize observer
  roObserver = new ResizeObserver(() => {
    if (containerRef.value && globeInstance) {
      globeInstance.width(containerRef.value.clientWidth)
      globeInstance.height(containerRef.value.clientHeight)
    }
  })
  roObserver.observe(containerRef.value)
})

onUnmounted(() => {
  roObserver?.disconnect()
  globeInstance?._destructor?.()
})

// Reactively update globe when filtered data changes
watch(() => store.filteredEvents, (evts) => {
  if (!globeInstance) return
  globeInstance
    .pointsData(evts)
    .arcsData(showArcs.value ? buildArcs(evts) : [])
    .ringsData(showRings.value ? evts.filter(e => e.severity === 'critical') : [])
}, { deep: false })

watch(showArcs, (v) => {
  globeInstance?.arcsData(v ? buildArcs(store.filteredEvents) : [])
})
watch(showRings, (v) => {
  globeInstance?.ringsData(v ? store.filteredEvents.filter(e => e.severity === 'critical') : [])
})

function resetCamera() {
  globeInstance?.pointOfView({ lat: 20, lng: 10, altitude: 2.2 }, 800)
}
function toggleRotation() {
  rotating.value = !rotating.value
  if (globeInstance) globeInstance.controls().autoRotate = rotating.value
}
function zoomIn()  { globeInstance?.pointOfView({ altitude: Math.max(0.5, (globeInstance.pointOfView().altitude || 2) * 0.7) }, 400) }
function zoomOut() { globeInstance?.pointOfView({ altitude: Math.min(5,   (globeInstance.pointOfView().altitude || 2) * 1.4) }, 400) }
function toggleHeatRings() { showRings.value = !showRings.value }
function toggleArcs()      { showArcs.value  = !showArcs.value  }
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
  z-index: 10;
}
.ctrl-btn {
  width: 28px;
  height: 28px;
  background: rgba(13,20,36,0.85);
  border: 1px solid #1e2d45;
  border-radius: 4px;
  color: #64748b;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  backdrop-filter: blur(4px);
}
.ctrl-btn:hover { color: #94a3b8; border-color: #3b82f6; }
.ctrl-btn.active { color: #3b82f6; border-color: rgba(59,130,246,0.5); background: rgba(59,130,246,0.1); }

.globe-legend {
  position: absolute;
  bottom: 12px;
  left: 12px;
  background: rgba(13,20,36,0.85);
  border: 1px solid #1e2d45;
  border-radius: 6px;
  padding: 8px 10px;
  backdrop-filter: blur(4px);
  z-index: 10;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: #94a3b8;
  margin-bottom: 4px;
}
.legend-item:last-child { margin-bottom: 0; }
.legend-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.legend-count {
  margin-left: auto;
  padding-left: 8px;
  color: #475569;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
}

.globe-tooltip {
  position: absolute;
  background: rgba(13,20,36,0.95);
  border: 1px solid #1e2d45;
  border-radius: 6px;
  padding: 8px 12px;
  pointer-events: none;
  z-index: 20;
  max-width: 240px;
  backdrop-filter: blur(4px);
}
.tt-type    { font-size: 12px; font-weight: 600; color: #e2e8f0; margin-bottom: 3px; }
.tt-country { font-size: 10px; color: #64748b; margin-bottom: 2px; }
.tt-fatal   { font-size: 10px; color: #ef4444; margin-bottom: 2px; }
.tt-actors  { font-size: 10px; color: #94a3b8; margin-bottom: 2px; }
.tt-source  { font-size: 9px;  color: #475569; }

.globe-stats {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(13,20,36,0.85);
  border: 1px solid #1e2d45;
  border-radius: 6px;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  backdrop-filter: blur(4px);
  z-index: 10;
}
.gs-item { display: flex; align-items: baseline; gap: 3px; }
.gs-val  { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; }
.gs-lbl  { color: #475569; font-size: 9px; }
.gs-sep  { color: #1e2d45; }
</style>
