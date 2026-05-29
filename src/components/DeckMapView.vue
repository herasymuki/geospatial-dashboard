<template>
  <div class="deckmap-container" ref="containerRef">
    <canvas ref="canvasRef" class="deck-canvas"></canvas>

    <!-- Controls -->
    <div class="deck-controls">
      <button @click="resetView" title="Reset View">
        <i class="fa-solid fa-crosshairs"></i> Reset
      </button>
      <select v-model="activeLayer" class="layer-select">
        <option value="scatter">Scatter Plot</option>
        <option value="hexagon">Hexagon Aggregation</option>
        <option value="arc">Arc Connections</option>
        <option value="grid">Grid Aggregation</option>
      </select>
    </div>

    <!-- Tooltip -->
    <div
      class="deck-tooltip"
      v-if="deckTooltip.visible"
      :style="{ left: deckTooltip.x + 'px', top: deckTooltip.y + 'px' }"
    >
      <div v-if="deckTooltip.object">
        <div class="tt-country">
          {{ deckTooltip.object.country || (deckTooltip.object.points?.length + ' events') }}
        </div>
        <div v-if="deckTooltip.object.fatalities !== undefined">
          <i class="fa-solid fa-skull"></i> {{ deckTooltip.object.fatalities }} fatalities
        </div>
        <div v-if="deckTooltip.object.type">{{ deckTooltip.object.type }}</div>
      </div>
    </div>

    <!-- Layer legend -->
    <div class="deck-legend">
      <div class="legend-title">
        <i class="fa-solid fa-circle-info"></i>
        {{ legendTitle }}
      </div>
      <div class="legend-items">
        <div class="legend-item" v-for="item in legendItems" :key="item.label">
          <span class="legend-swatch" :style="{ background: item.color }"></span>
          <span>{{ item.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import { useConflictsStore } from "@/stores/conflicts";

const store = useConflictsStore();
const containerRef = ref(null);
const canvasRef   = ref(null);
const activeLayer = ref("scatter");
const deckTooltip = ref({ visible: false, x: 0, y: 0, object: null });

let deckInstance  = null;
let currentViewState = {
  longitude: 20,
  latitude:  15,
  zoom:      1.8,
  pitch:     45,
  bearing:   0,
};

// ── Severity colour palette ──────────────────────────────────────────────────
const SEVERITY_COLORS = {
  critical: [255, 23,  68,  230],
  high:     [255, 109, 0,   210],
  medium:   [255, 214, 0,   190],
  low:      [0,   229, 255, 170],
};

const COLOR_RANGE = [
  [0,   229, 255, 180],
  [0,   150, 255, 200],
  [255, 214, 0,   200],
  [255, 109, 0,   220],
  [255, 23,  68,  240],
  [180, 0,   50,  255],
];

// ── Legend ───────────────────────────────────────────────────────────────────
const legendTitle = computed(() => {
  const map = {
    scatter: 'Severity Scale',
    hexagon: 'Fatality Density',
    arc:     'Conflict Connections',
    grid:    'Event Density',
  };
  return map[activeLayer.value] || '';
});

const legendItems = computed(() => {
  if (activeLayer.value === 'scatter') {
    return [
      { label: 'Critical',  color: 'rgba(255,23,68,0.9)'  },
      { label: 'High',      color: 'rgba(255,109,0,0.9)'  },
      { label: 'Medium',    color: 'rgba(255,214,0,0.9)'  },
      { label: 'Low',       color: 'rgba(0,229,255,0.9)'  },
    ];
  }
  return [
    { label: 'Low',    color: 'rgba(0,229,255,0.8)'  },
    { label: 'Medium', color: 'rgba(255,214,0,0.8)'  },
    { label: 'High',   color: 'rgba(255,109,0,0.8)'  },
    { label: 'Max',    color: 'rgba(255,23,68,0.9)'  },
  ];
});

// ── Deck.gl initialisation ───────────────────────────────────────────────────
async function initDeck() {
  const { Deck }      = await import("@deck.gl/core");
  const { MapView }   = await import("@deck.gl/core");
  const container     = containerRef.value;
  if (!container || !canvasRef.value) return;

  deckInstance = new Deck({
    canvas: canvasRef.value,
    width:  container.clientWidth,
    height: container.clientHeight,

    // Explicit MapView — standalone mode (no external map provider)
    views: [new MapView({ repeat: true })],

    initialViewState: { ...currentViewState },

    controller: true,

    // Keep viewState in sync so layers re-render on pan/zoom
    onViewStateChange: ({ viewState }) => {
      currentViewState = viewState;
      if (deckInstance) {
        deckInstance.setProps({ viewState });
        // Refresh basemap tiles on every pan/zoom so tiles match current view
        updateLayers();
      }
    },

    onHover: ({ object, x, y }) => {
      deckTooltip.value = { visible: !!object, x, y, object: object || null };
    },

    onClick: ({ object }) => {
      if (object?.country) store.selectConflict(object);
    },

    // Start with empty layers — updateLayers() fills them in
    layers: [],
  });

  await updateLayers();
}

// ── Tile basemap builder — dynamic tiles responding to viewState ──────────────
// Correct Web Mercator inverse projection; covers only visible tiles at the
// current zoom level so the map is always crisp and data points are aligned.

function mercatorYToLat(y, zoom) {
  const n = Math.pow(2, zoom);
  return (180 / Math.PI) * Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
}

function buildTileBasemap(BitmapLayer, viewState) {
  const vZoom  = viewState?.zoom      ?? 2;
  const lng    = viewState?.longitude ?? 0;
  const lat    = viewState?.latitude  ?? 0;
  const zoom   = Math.max(0, Math.min(8, Math.floor(vZoom)));
  const n      = Math.pow(2, zoom);
  const layers = [];

  // Centre tile in tile-space
  const cx = Math.floor(((lng + 180) / 360) * n);
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const cy = Math.floor(
    ((1 - Math.log((1 + sinLat) / (1 - sinLat)) / (2 * Math.PI)) / 2) * n
  );

  // Pad viewport by extra tiles each side for smooth panning
  const halfX = Math.ceil((window.innerWidth  / 256) / 2) + 3;
  const halfY = Math.ceil((window.innerHeight / 256) / 2) + 3;

  const seen = new Set();
  for (let dx = -halfX; dx <= halfX; dx++) {
    for (let dy = -halfY; dy <= halfY; dy++) {
      const tx = ((cx + dx) % n + n) % n;  // wrap longitude
      const ty = cy + dy;
      if (ty < 0 || ty >= n) continue;
      const key = `${zoom}-${tx}-${ty}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const west  = (tx / n) * 360 - 180;
      const east  = ((tx + 1) / n) * 360 - 180;
      const north = mercatorYToLat(ty,     zoom);
      const south = mercatorYToLat(ty + 1, zoom);

      layers.push(new BitmapLayer({
        id:     `basemap-${key}`,
        image:  `https://basemaps.cartocdn.com/dark_all/${zoom}/${tx}/${ty}.png`,
        bounds: [west, south, east, north],
        opacity: 1,
      }));
    }
  }
  return layers;
}

// ── Layer builder ────────────────────────────────────────────────────────────
async function updateLayers() {
  if (!deckInstance) return;

  // ── 1. Basemap — CartoDB Dark Matter tiles via BitmapLayer (no geo-layers dep) ──
  const { BitmapLayer } = await import("@deck.gl/layers");
  const basemap = buildTileBasemap(BitmapLayer, currentViewState);

  // ── 2. Data layers ────────────────────────────────────────────────────────
  const events = store.allEvents;
  let dataLayers = [];

  if (events.length > 0) {
    const { ScatterplotLayer, ArcLayer } = await import("@deck.gl/layers");
    const { HexagonLayer, GridLayer }    = await import("@deck.gl/aggregation-layers");

    if (activeLayer.value === "scatter") {
      dataLayers = [
        new ScatterplotLayer({
          id:               "scatter",
          data:             events,
          getPosition:      d => [d.lng, d.lat],
          getRadius:        d => {
            const f = d.fatalities || 0;
            if (f === 0)   return 30000;
            if (f < 10)    return 60000;
            if (f < 100)   return 120000;
            return Math.min(400000, 120000 + f * 500);
          },
          getFillColor:     d => SEVERITY_COLORS[d.severity] || [0, 229, 255, 160],
          getLineColor:     [255, 255, 255, 60],
          lineWidthMinPixels: 1,
          pickable:         true,
          radiusMinPixels:  3,
          radiusMaxPixels:  40,
          radiusUnits:      "meters",
        }),
      ];

    } else if (activeLayer.value === "hexagon") {
      dataLayers = [
        new HexagonLayer({
          id:                  "hexagon",
          data:                events,
          getPosition:         d => [d.lng, d.lat],
          getElevationWeight:  d => Math.max(1, d.fatalities || 0),
          getColorWeight:      d => Math.max(1, d.fatalities || 0),
          elevationScale:      500,
          radius:              150000,
          extruded:            true,
          pickable:            true,
          colorRange:          COLOR_RANGE,
        }),
      ];

    } else if (activeLayer.value === "arc") {
      const top  = store.conflictsByCountry?.slice(0, 15) || [];
      const arcs = [];
      for (let i = 0; i < top.length - 1; i++) {
        arcs.push({ source: top[i], target: top[i + 1] });
      }
      dataLayers = [
        new ScatterplotLayer({
          id:             "arc-points",
          data:           events,
          getPosition:    d => [d.lng, d.lat],
          getRadius:      40000,
          getFillColor:   d => SEVERITY_COLORS[d.severity] || [0, 229, 255, 160],
          pickable:       true,
          radiusMinPixels: 2,
          radiusUnits:    "meters",
        }),
        new ArcLayer({
          id:                "arcs",
          data:              arcs,
          getSourcePosition: d => [d.source.lng, d.source.lat],
          getTargetPosition: d => [d.target.lng,  d.target.lat],
          getSourceColor:    [255, 23,  68,  200],
          getTargetColor:    [255, 109, 0,   200],
          getWidth:          2,
          pickable:          false,
        }),
      ];

    } else if (activeLayer.value === "grid") {
      dataLayers = [
        new GridLayer({
          id:                 "grid",
          data:               events,
          getPosition:        d => [d.lng, d.lat],
          getElevationWeight: d => Math.max(1, d.fatalities || 0),
          elevationScale:     300,
          cellSize:           200000,
          extruded:           true,
          pickable:           true,
          colorRange:         COLOR_RANGE,
        }),
      ];
    }
  }

  // Basemap always first, data layers on top
  deckInstance.setProps({ layers: [...basemap, ...dataLayers] });
}

// ── Reset view ───────────────────────────────────────────────────────────────
function resetView() {
  if (!deckInstance) return;
  currentViewState = { longitude: 20, latitude: 15, zoom: 1.8, pitch: 45, bearing: 0 };
  deckInstance.setProps({
    viewState: { ...currentViewState, transitionDuration: 800 },
  });
}

// ── Resize handler ───────────────────────────────────────────────────────────
function handleResize() {
  if (deckInstance && containerRef.value) {
    deckInstance.setProps({
      width:  containerRef.value.clientWidth,
      height: containerRef.value.clientHeight,
    });
  }
}

// ── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  await initDeck();
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
  if (deckInstance) deckInstance.finalize();
});

watch(() => store.allEvents, () => updateLayers(), { deep: false });
watch(activeLayer, () => updateLayers());
</script>

<style scoped>
.deckmap-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: #050a14;
  overflow: hidden;
}

.deck-canvas {
  position: absolute;
  inset: 0;
  width: 100% !important;
  height: 100% !important;
}

/* ── Controls ── */
.deck-controls {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  gap: 8px;
  z-index: 10;
}

.deck-controls button {
  background: rgba(5, 10, 20, 0.85);
  border: 1px solid rgba(0, 229, 255, 0.35);
  color: #00e5ff;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-family: "JetBrains Mono", monospace;
  backdrop-filter: blur(8px);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.deck-controls button:hover {
  background: rgba(0, 229, 255, 0.15);
  border-color: #00e5ff;
}

.layer-select {
  background: rgba(5, 10, 20, 0.85);
  border: 1px solid rgba(0, 229, 255, 0.35);
  color: #00e5ff;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-family: "JetBrains Mono", monospace;
  cursor: pointer;
  backdrop-filter: blur(8px);
  outline: none;
}

.layer-select option {
  background: #0a1628;
  color: #e0e8f0;
}

/* ── Tooltip ── */
.deck-tooltip {
  position: absolute;
  background: rgba(5, 10, 20, 0.92);
  border: 1px solid rgba(0, 229, 255, 0.4);
  border-radius: 8px;
  padding: 10px 14px;
  pointer-events: none;
  z-index: 20;
  min-width: 160px;
  backdrop-filter: blur(12px);
  font-size: 12px;
  color: #e0e8f0;
  transform: translate(12px, -50%);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
}

.tt-country {
  font-weight: 600;
  color: #00e5ff;
  margin-bottom: 4px;
  font-size: 13px;
}

.deck-tooltip i {
  color: #ff1744;
  margin-right: 4px;
}

/* ── Legend ── */
.deck-legend {
  position: absolute;
  bottom: 20px;
  right: 12px;
  background: rgba(5, 10, 20, 0.85);
  border: 1px solid rgba(0, 229, 255, 0.25);
  border-radius: 8px;
  padding: 10px 14px;
  z-index: 10;
  backdrop-filter: blur(8px);
  min-width: 150px;
}

.legend-title {
  font-size: 11px;
  color: #00e5ff;
  font-family: "JetBrains Mono", monospace;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #a0b0c0;
}

.legend-swatch {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}
</style>
