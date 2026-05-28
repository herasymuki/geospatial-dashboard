<template>
  <div ref="containerRef" class="deck-container">
    <canvas ref="canvasRef" class="deck-canvas"></canvas>
    <!-- Leaflet base map -->
    <div ref="mapRef" class="leaflet-base"></div>
    <div class="deck-controls">
      <button
        v-for="layer in layerToggles"
        :key="layer.id"
        :class="['layer-btn', { active: activeLayers[layer.id] }]"
        @click="toggleLayer(layer.id)"
      >{{ layer.label }}</button>
    </div>
    <div class="deck-tooltip" v-if="tooltip.visible" :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
      <div class="tt-type">{{ tooltip.data?.type }}</div>
      <div class="tt-country">{{ tooltip.data?.country }} · {{ tooltip.data?.date }}</div>
      <div class="tt-fatal" v-if="tooltip.data?.fatalities">⚠ {{ tooltip.data.fatalities }} fatalities</div>
      <div class="tt-source">{{ tooltip.data?.source }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, reactive, nextTick } from 'vue'
import { useConflictsStore } from '@/stores/conflicts'

const store        = useConflictsStore()
const containerRef = ref(null)
const canvasRef    = ref(null)
const mapRef       = ref(null)
let   deckInstance = null
let   leafletMap   = null

const tooltip = reactive({ visible: false, x: 0, y: 0, data: null })

const activeLayers = reactive({
  heatmap:    true,
  scatter:    true,
  arcs:       true,
  geojson:    true,
  hexagon:    false,
})

const layerToggles = [
  { id: 'heatmap',  label: '🔥 Heat' },
  { id: 'scatter',  label: '⬤ Points' },
  { id: 'arcs',     label: '↗ Arcs' },
  { id: 'geojson',  label: '🗺 Regions' },
  { id: 'hexagon',  label: '⬡ Hex' },
]

onMounted(async () => {
  await nextTick()

  // ── Leaflet dark base map ──────────────────────────────────────────────────
  const L = (await import('leaflet')).default
  leafletMap = L.map(mapRef.value, {
    center: [20, 0],
    zoom: 2,
    zoomControl: false,
    attributionControl: false
  })
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
  }).addTo(leafletMap)

  // ── Deck.gl overlay ────────────────────────────────────────────────────────
  const { Deck }               = await import('@deck.gl/core')
  const { HeatmapLayer, ScatterplotLayer, ArcLayer, GeoJsonLayer, HexagonLayer } = await import('@deck.gl/layers')

  const getViewState = () => {
    const c = leafletMap.getCenter()
    return {
      longitude: c.lng,
      latitude:  c.lat,
      zoom:      leafletMap.getZoom() - 1,
      pitch:     0,
      bearing:   0
    }
  }

  deckInstance = new Deck({
    canvas:    canvasRef.value,
    width:     '100%',
    height:    '100%',
    controller: false,
    initialViewState: getViewState(),
    layers: buildLayers(),
    onHover: ({ object, x, y }) => {
      if (object) {
        tooltip.visible = true
        tooltip.x = x + 12
        tooltip.y = y + 12
        tooltip.data = object
      } else {
        tooltip.visible = false
      }
    },
    onClick: ({ object }) => {
      if (object) store.selectEvent(object)
    },
    getTooltip: null
  })

  // Sync deck with leaflet
  leafletMap.on('move', () => {
    deckInstance.setProps({ viewState: getViewState() })
  })
  leafletMap.on('zoom', () => {
    deckInstance.setProps({ viewState: getViewState() })
  })

  const ro = new ResizeObserver(() => {
    if (containerRef.value) {
      deckInstance.setProps({
        width:  containerRef.value.clientWidth,
        height: containerRef.value.clientHeight
      })
      leafletMap.invalidateSize()
    }
  })
  ro.observe(containerRef.value)

  onUnmounted(() => { ro.disconnect(); deckInstance.finalize(); leafletMap.remove() })
})

watch(() => [store.filteredEvents, activeLayers], () => {
  deckInstance?.setProps({ layers: buildLayers() })
}, { deep: true })

async function buildLayers() {
  const { HeatmapLayer, ScatterplotLayer, ArcLayer, GeoJsonLayer, HexagonLayer } = await import('@deck.gl/layers')
  const events = store.filteredEvents
  const layers = []

  if (activeLayers.heatmap) {
    layers.push(new HeatmapLayer({
      id: 'heatmap',
      data: events,
      getPosition: d => [d.lng, d.lat],
      getWeight:   d => Math.max(d.fatalities, 1),
      radiusPixels: 40,
      intensity:    1.2,
      threshold:    0.05,
      colorRange: [
        [0,0,255,0], [0,100,255,80], [0,200,255,120],
        [255,200,0,160], [255,100,0,200], [255,0,0,255]
      ]
    }))
  }

  if (activeLayers.hexagon) {
    layers.push(new HexagonLayer({
      id: 'hexagon',
      data: events,
      getPosition: d => [d.lng, d.lat],
      getElevationWeight: d => d.fatalities + 1,
      elevationScale: 500,
      radius: 80000,
      extruded: true,
      pickable: true,
      colorRange: [
        [1,152,189], [73,227,206], [216,254,181],
        [254,237,177], [254,173,84], [209,55,78]
      ]
    }))
  }

  if (activeLayers.scatter) {
    layers.push(new ScatterplotLayer({
      id: 'scatter',
      data: events,
      getPosition:    d => [d.lng, d.lat],
      getFillColor:   d => [...d.color, 200],
      getLineColor:   d => [...d.color, 255],
      getRadius:      d => Math.max(Math.sqrt(d.fatalities + 1) * 8000, 15000),
      radiusMinPixels: 3,
      radiusMaxPixels: 30,
      stroked: true,
      lineWidthMinPixels: 1,
      pickable: true,
    }))
  }

  if (activeLayers.arcs) {
    const arcData = buildArcData(events)
    layers.push(new ArcLayer({
      id: 'arcs',
      data: arcData,
      getSourcePosition: d => [d.sourceLng, d.sourceLat],
      getTargetPosition: d => [d.targetLng, d.targetLat],
      getSourceColor: [239, 68, 68, 80],
      getTargetColor: [245, 158, 11, 80],
      getWidth: 1,
      pickable: false,
    }))
  }

  return layers
}

function buildArcData(events) {
  const critical = events.filter(e => e.severity === 'critical').slice(0, 40)
  const arcs = []
  for (let i = 0; i < critical.length - 1; i++) {
    arcs.push({
      sourceLat: critical[i].lat,   sourceLng: critical[i].lng,
      targetLat: critical[i+1].lat, targetLng: critical[i+1].lng,
    })
  }
  return arcs
}

function toggleLayer(id) { activeLayers[id] = !activeLayers[id] }
</script>

<style scoped>
.deck-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.leaflet-base {
  position: absolute;
  inset: 0;
  z-index: 1;
}
.deck-canvas {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}
.deck-controls {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.layer-btn {
  padding: 4px 10px;
  background: rgba(17,24,39,0.9);
  border: 1px solid #1e2d45;
  border-radius: 4px;
  color: #64748b;
  font-size: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.layer-btn:hover { color: #94a3b8; }
.layer-btn.active { color: #3b82f6; border-color: rgba(59,130,246,0.4); background: rgba(59,130,246,0.08); }

.deck-tooltip {
  position: absolute;
  z-index: 20;
  background: #111827;
  border: 1px solid #1e2d45;
  border-radius: 6px;
  padding: 8px 12px;
  pointer-events: none;
  font-size: 11px;
  max-width: 220px;
}
.tt-type    { font-weight: 600; color: #e2e8f0; margin-bottom: 3px; }
.tt-country { color: #64748b; font-size: 10px; margin-bottom: 2px; }
.tt-fatal   { color: #ef4444; font-size: 10px; margin-bottom: 2px; }
.tt-source  { color: #3b82f6; font-size: 10px; }
</style>
