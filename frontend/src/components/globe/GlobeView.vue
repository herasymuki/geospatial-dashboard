<template>
  <div ref="containerRef" class="globe-container">
    <div ref="globeEl" class="globe-el"></div>

    <!-- ── Pause / Resume rotation — top-center ── -->
    <div class="globe-rotation-ctrl">
      <button
        @click="toggleRotation"
        :class="['rotation-btn', { paused: !rotating }]"
        :title="rotating ? 'Pause rotation' : 'Resume rotation'"
      >
        <i :class="rotating ? 'fa-solid fa-pause' : 'fa-solid fa-play'"></i>
        <span class="rotation-label">{{ rotating ? 'PAUSE ROTATION' : 'RESUME ROTATION' }}</span>
      </button>
    </div>

    <!-- ── Side controls (right) ── -->
    <div class="globe-controls">
      <button @click="resetCamera" title="Reset view" class="ctrl-btn">
        <i class="fa-solid fa-crosshairs"></i>
      </button>
      <button @click="zoomIn"  class="ctrl-btn" title="Zoom in">
        <i class="fa-solid fa-plus"></i>
      </button>
      <button @click="zoomOut" class="ctrl-btn" title="Zoom out">
        <i class="fa-solid fa-minus"></i>
      </button>
      <button @click="toggleHeatRings" :class="['ctrl-btn', { active: showRings }]" title="Pulse rings">
        <i class="fa-solid fa-circle-dot"></i>
      </button>
      <button @click="toggleArcs" :class="['ctrl-btn', { active: showArcs }]" title="Conflict arcs">
        <i class="fa-solid fa-arrow-trend-up"></i>
      </button>
    </div>

    <!-- ── Layer legend ── -->
    <div class="globe-legend">
      <div v-for="item in legend" :key="item.label" class="legend-item">
        <span class="legend-dot" :style="{ background: item.color }"></span>
        <span>{{ item.label }}</span>
        <span class="legend-count">{{ item.count }}</span>
      </div>
    </div>

    <!-- ── Hover tooltip ── -->
    <div v-if="hoveredEvent" class="globe-tooltip"
         :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }">
      <div class="tt-type">{{ hoveredEvent.type }}</div>
      <div class="tt-country">{{ hoveredEvent.country }} &middot; {{ hoveredEvent.date }}</div>
      <div class="tt-fatal" v-if="hoveredEvent.fatalities > 0">
        <i class="fa-solid fa-triangle-exclamation"></i>
        {{ hoveredEvent.fatalities.toLocaleString() }} fatalities
      </div>
      <div class="tt-actors" v-if="hoveredEvent.actor1">
        {{ hoveredEvent.actor1 }}{{ hoveredEvent.actor2 ? ' vs ' + hoveredEvent.actor2 : '' }}
      </div>
      <div class="tt-source">{{ hoveredEvent.source }}</div>
    </div>

    <!-- ── Stats overlay ── -->
    <div class="globe-stats">
      <span class="gs-item">
        <i class="fa-solid fa-bolt gs-icon text-blue-400"></i>
        <span class="gs-val text-blue-400">{{ store.stats.totalEvents.toLocaleString() }}</span>
        <span class="gs-lbl">events</span>
      </span>
      <span class="gs-sep">&middot;</span>
      <span class="gs-item">
        <i class="fa-solid fa-skull gs-icon text-red-400"></i>
        <span class="gs-val text-red-400">{{ store.stats.totalFatalities.toLocaleString() }}</span>
        <span class="gs-lbl">fatalities</span>
      </span>
      <span class="gs-sep">&middot;</span>
      <span class="gs-item">
        <i class="fa-solid fa-earth-africa gs-icon text-amber-400"></i>
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

// NASA Night Lights texture (EOSDIS / NASA Blue Marble Night)
const NASA_NIGHT_LIGHTS_URL = 'https://unpkg.com/three-globe/example/img/earth-night.jpg'
const NASA_BUMP_URL         = 'https://unpkg.com/three-globe/example/img/earth-topology.png'
const NIGHT_SKY_URL         = 'https://unpkg.com/three-globe/example/img/night-sky.png'

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
      color:    a.severity === 'critical' ? '#ef444488' : '#f59e0b66',
      stroke:   a.severity === 'critical' ? 1.5 : 0.8,
    })
  }
  return arcs
}

function buildRings(events) {
  return events
    .filter(e => e.severity === 'critical' || e.severity === 'high')
    .slice(0, 40)
    .map(e => ({
      lat:    e.lat,
      lng:    e.lng,
      maxR:   e.severity === 'critical' ? 4 : 2.5,
      propagationSpeed: e.severity === 'critical' ? 2.5 : 1.5,
      repeatPeriod: e.severity === 'critical' ? 700 : 1200,
      color:  e.severity === 'critical' ? '#ef4444' : '#f59e0b',
    }))
}

function pointColor(e) {
  const map = {
    'Battles':                    'rgba(239,68,68,0.85)',
    'Violence against civilians': 'rgba(245,158,11,0.85)',
    'Explosions/Remote violence': 'rgba(234,179,8,0.85)',
    'Protests':                   'rgba(59,130,246,0.85)',
    'Riots':                      'rgba(168,85,247,0.85)',
    'Strategic developments':     'rgba(16,185,129,0.85)',
    'Armed Conflict':             'rgba(245,158,11,0.85)',
  }
  return map[e.type] || 'rgba(100,116,139,0.7)'
}

function pointRadius(e) {
  const base = { critical: 0.8, high: 0.55, medium: 0.38, low: 0.22 }
  return base[e.severity] || 0.22
}

async function initGlobe() {
  if (!globeEl.value) return
  const { default: Globe } = await import('globe.gl')

  globeInstance = Globe()(globeEl.value)
    .width(globeEl.value.clientWidth || 600)
    .height(globeEl.value.clientHeight || 500)
    .backgroundColor('rgba(0,0,0,0)')
    .globeImageUrl(NASA_NIGHT_LIGHTS_URL)
    .bumpImageUrl(NASA_BUMP_URL)
    .backgroundImageUrl(NIGHT_SKY_URL)
    .showAtmosphere(true)
    .atmosphereColor('#0a1628')
    .atmosphereAltitude(0.15)
    .pointsData(store.filteredEvents)
    .pointLat('lat')
    .pointLng('lng')
    .pointColor(pointColor)
    .pointRadius(pointRadius)
    .pointAltitude(d => d.severity === 'critical' ? 0.04 : 0.01)
    .pointResolution(6)
    .pointLabel(d => `
      <div style="background:#0d1424cc;border:1px solid #1e2d45;border-radius:6px;padding:8px 12px;font-family:monospace;font-size:11px;color:#e2e8f0;max-width:220px">
        <div style="color:${pointColor(d)};font-weight:700;margin-bottom:4px">${d.type}</div>
        <div style="color:#94a3b8">${d.country} &middot; ${d.date}</div>
        ${d.fatalities > 0 ? `<div style="color:#ef4444;margin-top:4px">${d.fatalities.toLocaleString()} fatalities</div>` : ''}
        ${d.actor1 ? `<div style="color:#64748b;margin-top:2px;font-size:10px">${d.actor1}${d.actor2 ? ' vs ' + d.actor2 : ''}</div>` : ''}
        <div style="color:#334155;margin-top:4px;font-size:9px">${d.source}</div>
      </div>
    `)
    .onPointClick(d => { store.selectEvent(d) })
    .onPointHover((d) => { hoveredEvent.value = d || null })

  // Arcs
  if (showArcs.value) {
    const arcs = buildArcs(store.filteredEvents)
    globeInstance
      .arcsData(arcs)
      .arcStartLat('startLat').arcStartLng('startLng')
      .arcEndLat('endLat').arcEndLng('endLng')
      .arcColor('color')
      .arcStroke('stroke')
      .arcDashLength(0.4)
      .arcDashGap(0.2)
      .arcDashAnimateTime(2000)
      .arcAltitudeAutoScale(0.35)
  }

  // Rings
  if (showRings.value) {
    const rings = buildRings(store.filteredEvents)
    globeInstance
      .ringsData(rings)
      .ringLat('lat').ringLng('lng')
      .ringMaxRadius('maxR')
      .ringPropagationSpeed('propagationSpeed')
      .ringRepeatPeriod('repeatPeriod')
      .ringColor(d => t => {
        const c = d.color
        const alpha = Math.max(0, 0.8 * (1 - t))
        return hexToRgba(c, alpha)
      })
  }

  startRotation()

  globeEl.value.addEventListener('mousemove', e => {
    tooltipPos.x = e.offsetX + 14
    tooltipPos.y = e.offsetY + 14
  })
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function startRotation() {
  if (!globeInstance) return
  globeInstance.controls().autoRotate = true
  globeInstance.controls().autoRotateSpeed = 0.4
}

function stopRotation() {
  if (!globeInstance) return
  globeInstance.controls().autoRotate = false
}

function toggleRotation() {
  rotating.value = !rotating.value
  rotating.value ? startRotation() : stopRotation()
}

function resetCamera() {
  if (!globeInstance) return
  globeInstance.pointOfView({ lat: 20, lng: 10, altitude: 2.5 }, 800)
}

function zoomIn() {
  if (!globeInstance) return
  const pov = globeInstance.pointOfView()
  globeInstance.pointOfView({ ...pov, altitude: Math.max(0.5, pov.altitude * 0.7) }, 300)
}

function zoomOut() {
  if (!globeInstance) return
  const pov = globeInstance.pointOfView()
  globeInstance.pointOfView({ ...pov, altitude: Math.min(5, pov.altitude * 1.4) }, 300)
}

function toggleHeatRings() {
  showRings.value = !showRings.value
  if (!globeInstance) return
  globeInstance.ringsData(showRings.value ? buildRings(store.filteredEvents) : [])
}

function toggleArcs() {
  showArcs.value = !showArcs.value
  if (!globeInstance) return
  globeInstance.arcsData(showArcs.value ? buildArcs(store.filteredEvents) : [])
}

function updateGlobe() {
  if (!globeInstance) return
  const evts = store.filteredEvents
  globeInstance.pointsData(evts)
  if (showArcs.value)  globeInstance.arcsData(buildArcs(evts))
  if (showRings.value) globeInstance.ringsData(buildRings(evts))
}

function resizeGlobe() {
  if (!globeInstance || !globeEl.value) return
  globeInstance
    .width(globeEl.value.clientWidth)
    .height(globeEl.value.clientHeight)
}

onMounted(async () => {
  await nextTick()
  await initGlobe()
  roObserver = new ResizeObserver(() => resizeGlobe())
  if (containerRef.value) roObserver.observe(containerRef.value)
})

onUnmounted(() => {
  if (roObserver) roObserver.disconnect()
  if (globeInstance) {
    try { globeInstance._destructor?.() } catch {}
    globeInstance = null
  }
})

watch(() => store.filteredEvents, updateGlobe, { deep: false })
</script>

<style scoped>
.globe-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, #0a1628 0%, #020408 100%);
  overflow: hidden;
}
.globe-el {
  width: 100%;
  height: 100%;
}

/* ── Pause / Resume button — top-center ── */
.globe-rotation-ctrl {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rotation-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 16px;
  background: rgba(13, 20, 36, 0.88);
  border: 1px solid #1e3a5f;
  border-radius: 20px;
  color: #60a5fa;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: all 0.18s ease;
  white-space: nowrap;
  box-shadow: 0 2px 12px rgba(0,0,0,0.4);
}
.rotation-btn i {
  font-size: 10px;
  width: 12px;
  text-align: center;
}
.rotation-btn:hover {
  background: rgba(59, 130, 246, 0.18);
  border-color: #3b82f6;
  color: #93c5fd;
  box-shadow: 0 2px 18px rgba(59,130,246,0.25);
}
.rotation-btn.paused {
  color: #34d399;
  border-color: #065f46;
  background: rgba(6, 95, 70, 0.18);
}
.rotation-btn.paused:hover {
  background: rgba(16, 185, 129, 0.2);
  border-color: #10b981;
  color: #6ee7b7;
}
.rotation-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

/* ── Side controls (right) ── */
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
  width: 30px;
  height: 30px;
  background: rgba(13, 20, 36, 0.85);
  border: 1px solid #1e2d45;
  border-radius: 4px;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  backdrop-filter: blur(4px);
}
.ctrl-btn:hover  { color: #94a3b8; border-color: #3b82f6; }
.ctrl-btn.active { color: #3b82f6; border-color: #3b82f6; background: rgba(59,130,246,0.12); }

/* ── Legend ── */
.globe-legend {
  position: absolute;
  bottom: 48px;
  left: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: rgba(13, 20, 36, 0.82);
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
}
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.legend-count {
  margin-left: auto;
  color: #475569;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
}

/* ── Tooltip ── */
.globe-tooltip {
  position: absolute;
  pointer-events: none;
  background: rgba(13, 20, 36, 0.95);
  border: 1px solid #1e2d45;
  border-radius: 6px;
  padding: 8px 12px;
  z-index: 20;
  max-width: 220px;
}
.tt-type    { font-size: 11px; font-weight: 700; color: #e2e8f0; margin-bottom: 3px; }
.tt-country { font-size: 10px; color: #94a3b8; }
.tt-fatal   { font-size: 10px; color: #ef4444; margin-top: 3px; display: flex; align-items: center; gap: 4px; }
.tt-actors  { font-size: 9px;  color: #64748b; margin-top: 2px; }
.tt-source  { font-size: 9px;  color: #334155; margin-top: 4px; }

/* ── Stats bar ── */
.globe-stats {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(13, 20, 36, 0.82);
  border: 1px solid #1e2d45;
  border-radius: 20px;
  padding: 5px 16px;
  backdrop-filter: blur(4px);
  z-index: 10;
}
.gs-item  { display: flex; align-items: center; gap: 5px; }
.gs-icon  { font-size: 10px; }
.gs-val   { font-size: 12px; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
.gs-lbl   { font-size: 9px; color: #475569; text-transform: uppercase; }
.gs-sep   { color: #1e2d45; font-size: 14px; }
.text-blue-400  { color: #60a5fa; }
.text-red-400   { color: #f87171; }
.text-amber-400 { color: #fbbf24; }
</style>
