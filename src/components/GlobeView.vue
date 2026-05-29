<template>
  <div class="globe-container" ref="containerRef">
    <div ref="globeRef" class="globe-el"></div>

    <!-- ── Pause / Resume Rotation — top-center ── -->
    <div class="globe-rotation-ctrl">
      <button
        class="rotation-btn"
        :class="rotating ? 'rotation-btn--active' : 'rotation-btn--paused'"
        @click="toggleRotation"
        :title="rotating ? 'Pause rotation' : 'Resume rotation'"
      >
        <i :class="rotating ? 'fa-solid fa-pause' : 'fa-solid fa-play'"></i>
        <span>{{ rotating ? 'PAUSE ROTATION' : 'RESUME ROTATION' }}</span>
      </button>
    </div>

    <!-- ── Side Controls ── -->
    <div class="globe-controls">
      <button @click="resetView" title="Reset view">
        <i class="fa-solid fa-crosshairs"></i>
      </button>
      <button @click="zoomIn" title="Zoom in">
        <i class="fa-solid fa-plus"></i>
      </button>
      <button @click="zoomOut" title="Zoom out">
        <i class="fa-solid fa-minus"></i>
      </button>
    </div>

    <!-- ── Legend ── -->
    <div class="globe-legend">
      <div v-for="item in legend" :key="item.label" class="legend-item">
        <span class="legend-dot" :style="{ background: item.color }"></span>
        <span>{{ item.label }}</span>
      </div>
    </div>

    <!-- ── Tooltip ── -->
    <div
      class="globe-tooltip"
      v-if="tooltip.visible"
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
    >
      <div class="tt-country">{{ tooltip.country }}</div>
      <div class="tt-type">{{ tooltip.type }}</div>
      <div class="tt-row">
        <i class="fa-solid fa-skull tt-icon"></i>
        {{ tooltip.fatalities.toLocaleString() }} fatalities
      </div>
      <div class="tt-row">
        <i class="fa-solid fa-calendar-days tt-icon"></i>
        {{ tooltip.date }}
      </div>
    </div>

    <!-- ── Error notice ── -->
    <div class="globe-error" v-if="initError">
      <i class="fa-solid fa-triangle-exclamation"></i>
      {{ initError }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useConflictsStore } from "@/stores/conflicts";

const store = useConflictsStore();
const globeRef      = ref(null);
const containerRef  = ref(null);
const rotating      = ref(true);
const initError     = ref("");

let globeInstance = null;

const tooltip = ref({
  visible: false, x: 0, y: 0,
  country: "", type: "", fatalities: 0, date: ""
});

const legend = [
  { label: "Critical (100+)", color: "#ff1744" },
  { label: "High (10–99)",    color: "#ff6d00" },
  { label: "Medium (1–9)",    color: "#ffd600" },
  { label: "Low (0)",         color: "#00e5ff" },
  { label: "GDACS Alert",     color: "#ff1744" },
  { label: "Refugee Flow",    color: "#fbbf24" },
];

const SEVERITY_COLORS = {
  critical: "#ff1744",
  high:     "#ff6d00",
  medium:   "#ffd600",
  low:      "#00e5ff",
};

function getColor(event)    { return SEVERITY_COLORS[event.severity] || "#00e5ff"; }
function getAltitude(event) {
  const f = event.fatalities;
  if (f === 0)  return 0.01;
  if (f < 10)   return 0.03;
  if (f < 100)  return 0.08;
  return Math.min(0.3, 0.1 + f / 5000);
}

async function initGlobe() {
  try {
    const { default: Globe } = await import("globe.gl");
    const el = globeRef.value;
    if (!el) return;

    const w = el.parentElement.clientWidth;
    const h = el.parentElement.clientHeight;

    // NASA Black Marble — VIIRS Night Lights composite
    const NIGHT_TEXTURE  = "https://unpkg.com/three-globe/example/img/earth-night.jpg";
    const BUMP_TEXTURE   = "https://unpkg.com/three-globe/example/img/earth-topology.png";
    const STARS_TEXTURE  = "https://unpkg.com/three-globe/example/img/night-sky.png";

    globeInstance = Globe()(el)
      .width(w)
      .height(h)
      .backgroundColor("#020810")
      .globeImageUrl(NIGHT_TEXTURE)
      .bumpImageUrl(BUMP_TEXTURE)
      .backgroundImageUrl(STARS_TEXTURE)
      .showAtmosphere(true)
      .atmosphereColor("#0d2a5e")
      .atmosphereAltitude(0.12);

    globeInstance.controls().autoRotate      = rotating.value;
    globeInstance.controls().autoRotateSpeed = 0.4;

    updateGlobeData();
  } catch (e) {
    initError.value = "Globe failed to initialise: " + e.message;
    console.error(e);
  }
}

function updateGlobeData() {
  if (!globeInstance) return;
  const events = store.allEvents;

  // Points
  globeInstance
    .pointsData(events)
    .pointLat(e => e.lat)
    .pointLng(e => e.lng)
    .pointAltitude(e => getAltitude(e))
    .pointRadius(e => {
      const f = e.fatalities;
      if (f === 0) return 0.15;
      if (f < 10)  return 0.25;
      if (f < 100) return 0.45;
      return Math.min(1.2, 0.5 + f / 2000);
    })
    .pointColor(e => getColor(e))
    .pointResolution(8)
    .onPointClick(e => { store.selectConflict(e); })
    .onPointHover((e, coords) => {
      if (e) {
        const rect = containerRef.value.getBoundingClientRect();
        tooltip.value = {
          visible:    true,
          x:          Math.min(coords?.x || 200, rect.width  - 240),
          y:          Math.min(coords?.y || 200, rect.height - 160),
          country:    e.country,
          type:       e.type,
          fatalities: e.fatalities,
          date:       e.date
        };
      } else {
        tooltip.value.visible = false;
      }
    });

  // Arcs — high-severity connections
  const highSev = events
    .filter(e => e.severity === "critical" || e.severity === "high")
    .slice(0, 30);
  const arcs = [];
  for (let i = 0; i < Math.min(highSev.length - 1, 20); i++) {
    arcs.push({
      startLat: highSev[i].lat,   startLng: highSev[i].lng,
      endLat:   highSev[i+1].lat, endLng:   highSev[i+1].lng,
      color:    ["rgba(255,23,68,0.6)", "rgba(255,109,0,0.3)"]
    });
  }
  globeInstance
    .arcsData(arcs)
    .arcStartLat(d => d.startLat).arcStartLng(d => d.startLng)
    .arcEndLat(d => d.endLat)   .arcEndLng(d => d.endLng)
    .arcColor(d => d.color)
    .arcAltitude(0.2)
    .arcStroke(0.4)
    .arcDashLength(0.4)
    .arcDashGap(0.2)
    .arcDashAnimateTime(3000);

  // Country labels
  const top = store.conflictsByCountry.slice(0, 8);
  globeInstance
    .labelsData(top)
    .labelLat(d => d.lat)
    .labelLng(d => d.lng)
    .labelText(d => d.country)
    .labelSize(1.2)
    .labelColor(() => "rgba(255,255,255,0.85)")
    .labelResolution(2)
    .labelAltitude(0.01);

  // Rings — GDACS alerts (pulsing rings at alert locations)
  const gdacsRings = (store.gdacsAlerts || []).map(a => ({
    lat: a.lat, lng: a.lng,
    maxR: a.alertLevel === "Red" ? 4 : a.alertLevel === "Orange" ? 3 : 2,
    propagationSpeed: a.alertLevel === "Red" ? 3 : 2,
    repeatPeriod: a.alertLevel === "Red" ? 700 : 1000,
    color: a.alertLevel === "Red" ? "#ff1744" : a.alertLevel === "Orange" ? "#ff6d00" : "#ffd600",
    label: a.title || a.country
  }));

  globeInstance
    .ringsData(gdacsRings)
    .ringLat(d => d.lat)
    .ringLng(d => d.lng)
    .ringMaxRadius(d => d.maxR)
    .ringPropagationSpeed(d => d.propagationSpeed)
    .ringRepeatPeriod(d => d.repeatPeriod)
    .ringColor(d => t => `${d.color}${Math.round((1 - t) * 200).toString(16).padStart(2, "0")}`);
}

function resetView() {
  if (globeInstance) {
    globeInstance.pointOfView({ lat: 20, lng: 10, altitude: 2.5 }, 1000);
  }
}

function toggleRotation() {
  rotating.value = !rotating.value;
  if (globeInstance) {
    globeInstance.controls().autoRotate = rotating.value;
  }
}

function zoomIn() {
  if (globeInstance) {
    const pov = globeInstance.pointOfView();
    globeInstance.pointOfView({ ...pov, altitude: Math.max(0.5, pov.altitude * 0.7) }, 500);
  }
}

function zoomOut() {
  if (globeInstance) {
    const pov = globeInstance.pointOfView();
    globeInstance.pointOfView({ ...pov, altitude: Math.min(6, pov.altitude * 1.4) }, 500);
  }
}

function handleResize() {
  if (globeInstance && containerRef.value) {
    globeInstance.width(containerRef.value.clientWidth);
    globeInstance.height(containerRef.value.clientHeight);
  }
}

onMounted(() => {
  initGlobe();
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});

watch(() => store.allEvents, () => updateGlobeData(), { deep: false });
</script>

<style scoped>
.globe-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: #020810;
  overflow: hidden;
}

.globe-el {
  width: 100%;
  height: 100%;
}

/* ── Pause / Resume — top-center ── */
.globe-rotation-ctrl {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  pointer-events: all;
}

.rotation-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 18px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(5, 12, 28, 0.72);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 0.22s ease;
  white-space: nowrap;
}

.rotation-btn i {
  font-size: 12px;
}

.rotation-btn--active {
  color: #60a5fa;
  border-color: rgba(96, 165, 250, 0.45);
  box-shadow: 0 0 12px rgba(96, 165, 250, 0.2);
}

.rotation-btn--active:hover {
  background: rgba(96, 165, 250, 0.15);
  border-color: rgba(96, 165, 250, 0.7);
  box-shadow: 0 0 18px rgba(96, 165, 250, 0.35);
}

.rotation-btn--paused {
  color: #4ade80;
  border-color: rgba(74, 222, 128, 0.45);
  box-shadow: 0 0 12px rgba(74, 222, 128, 0.2);
}

.rotation-btn--paused:hover {
  background: rgba(74, 222, 128, 0.15);
  border-color: rgba(74, 222, 128, 0.7);
  box-shadow: 0 0 18px rgba(74, 222, 128, 0.35);
}

/* ── Side Controls ── */
.globe-controls {
  position: absolute;
  top: 60px;
  right: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 20;
}

.globe-controls button {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(5, 12, 28, 0.72);
  backdrop-filter: blur(8px);
  color: rgba(255,255,255,0.75);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s ease;
}

.globe-controls button:hover {
  background: rgba(96, 165, 250, 0.18);
  border-color: rgba(96, 165, 250, 0.5);
  color: #fff;
}

/* ── Legend ── */
.globe-legend {
  position: absolute;
  bottom: 18px;
  left: 14px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  z-index: 20;
  background: rgba(5, 12, 28, 0.65);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  padding: 10px 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  color: rgba(255,255,255,0.75);
}

.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Tooltip ── */
.globe-tooltip {
  position: absolute;
  background: rgba(5, 12, 28, 0.92);
  border: 1px solid rgba(96, 165, 250, 0.35);
  border-radius: 8px;
  padding: 10px 14px;
  pointer-events: none;
  z-index: 30;
  min-width: 180px;
  backdrop-filter: blur(10px);
}

.tt-country {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}

.tt-type {
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 6px;
}

.tt-row {
  font-size: 11px;
  color: rgba(255,255,255,0.8);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
}

.tt-icon {
  color: #60a5fa;
  font-size: 10px;
  width: 12px;
  text-align: center;
}

/* ── Error ── */
.globe-error {
  position: absolute;
  bottom: 18px;
  right: 14px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 11px;
  color: #fca5a5;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 20;
}
</style>
