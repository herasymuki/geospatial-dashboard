<template>
  <div ref="containerRef" class="deck-container">
    <!-- Leaflet base map -->
    <div ref="mapRef" class="leaflet-base"></div>
    <!-- Deck.gl canvas overlay -->
    <canvas ref="canvasRef" class="deck-canvas"></canvas>

    <!-- Layer toggles -->
    <div class="deck-controls">
      <button
        v-for="layer in layerToggles"
        :key="layer.id"
        :class="['layer-btn', { active: activeLayers[layer.id] }]"
        @click="toggleLayer(layer.id)"
      >{{ layer.label }}</button>
    </div>

    <!-- Tooltip -->
    <Transition name="tt-fade">
      <div v-if="tooltip.visible" class="deck-tooltip"
           :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
        <div class="tt-type">{{ tooltip.data?.type }}</div>
        <div class="tt-country">{{ tooltip.data?.country }} · {{ tooltip.data?.date }}</div>
        <div class="tt-fatal" v-if="tooltip.data?.fatalities > 0">
          ⚠ {{ tooltip.data.fatalities.toLocaleString() }} fatalities
        </div>
        <div class="tt-actors" v-if="tooltip.data?.actor1">
          {{ tooltip.data.actor1 }}{{ tooltip.data.actor2 ? ' vs ' + tooltip.data.actor2 : '' }}
        </div>
        <div class="tt-source">{{ tooltip.data?.source }}</div>
      </div>
    </Transition>

    <!-- Stats overlay -->
    <div class="deck-stats">
      <span class="ds-label">DECK.GL</span>
      <span class="ds-sep">·</span>
      <span class="ds-val text-blue-400">{{ store.filteredEvents.length.toLocaleString() }}</span>
      <span class="ds-lbl">events rendered</span>
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
let   roObserver   = null

const tooltip = reactive({ visible: false, x: 0, y: 0, data: null })

const activeLayers = reactive({
  heatmap:  true,
  scatter:  true,
  arcs:     true,
  hexagon:  false,
})

const layerToggles = [
  { id: 'heatmap', label: '🔥 Heat'   },
  { id: 'scatter', label: '⬤ Points' },
  { id: 'arcs',    label: '↗ Arcs'   },
  { id: 'hexagon', label: '⬡ Hex'    },
]

function toggleLayer(id) {
  activeLayers[id] = !activeLayers[id]
  rebuildLayers()
}

function buildLayers(HeatmapLayer, ScatterplotLayer, ArcLayer, HexagonLayer) {
  const evts = store.filteredEvents
  const layers = []

  if (activeLayers.heatmap && evts.length) {
    layers.push(new HeatmapLayer({
      id:           'heatmap',
      data:         evts,
      getPosition:  d => [d.lng, d.lat],
      getWeight:    d => Math.max(1, d.fatalities * 0.1 + 1),
      radiusPixels: 40,
      intensity:    1.2,
      threshold:    0.05,
      colorRange: [
        [0,   0,   255, 0],
        [0,   128, 255, 80],
        [0,   255, 128, 120],
        [255, 255, 0,   160],
        [255, 128, 0,   200],
        [255, 0,   0,   240],
      ],
      pickable: false,
    }))
  }

  if (activeLayers.scatter && evts.length) {
    layers.push(new ScatterplotLayer({
      id:              'scatter',
      data:            evts,
      getPosition:     d => [d.lng, d.lat],
      getRadius:       d => {
        const base = { critical: 35000, high: 22000, medium: 12000, low: 6000 }
        return base[d.severity] || 6000
      },
      getFillColor:    d => [...d.color, 180],
      getLineColor:    d => [...d.color, 255],
      lineWidthMinPixels: 1,
      stroked:         true,
      filled:          true,
      radiusMinPixels: 3,
      radiusMaxPixels: 24,
      pickable:        true,
      autoHighlight:   true,
      highlightColor:  [255, 255, 255, 60],
      onHover: ({ object, x, y }) => {
        if (object) {
          tooltip.visible = true
          tooltip.x = x + 14
          tooltip.y = y + 14
          tooltip.data = object
        } else {
          tooltip.visible = false
        }
      },
      onClick: ({ object }) => {
        if (object) store.selectEvent(object)
      },
    }))
  }

  if (activeLayers.arcs && evts.length) {
    const high = evts.filter(e => e.severity === 'critical' || e.severity === 'high')
    const arcData = []
    for (let i = 0; i < Math.min(high.length - 1, 80); i++) {
      const a = high[i], b = high[(i + 4) % high.length]
      if (!a || !b) continue
      if (Math.abs(a.lat - b.lat) < 0.3 && Math.abs(a.lng - b.lng) < 0.3) continue
      arcData.push({ source: a, target: b })
    }
    layers.push(new ArcLayer({
      id:             'arcs',
      data:           arcData,
      getSourcePosition: d => [d.source.lng, d.source.lat],
      getTargetPosition: d => [d.target.lng, d.target.lat],
      getSourceColor: d => [...d.source.color, 160],
      getTargetColor: d => [...d.target.color, 40],
      getWidth:       d => d.source.severity === 'critical' ? 2 : 1,
      pickable:       false,
    }))
  }

  if (activeLayers.hexagon && evts.length) {
    layers.push(new HexagonLayer({
      id:           'hexagon',
      data:         evts,
      getPosition:  d => [d.lng, d.lat],
      getElevationWeight: d => d.fatalities + 1,
      elevationScale: 80,
      extruded:     true,
      radius:       50000,
      coverage:     0.85,
      colorRange: [
        [1,   152, 189, 200],
        [73,  227, 206, 200],
        [216, 254, 181, 200],
        [254, 237, 177, 200],
        [254, 173, 84,  200],
        [209, 55,  78,  200],
      ],
      pickable:     false,
    }))
  }

  return layers
}

let _HeatmapLayer, _ScatterplotLayer, _ArcLayer, _HexagonLayer, _Deck

async function initDeck() {
  if (!canvasRef.value || !mapRef.value) return

  // Init Leaflet base map
  const L = await import('leaflet')
  await import('leaflet/dist/leaflet.css')

  leafletMap = L.map(mapRef.value, {
    center:          [20, 10],
    zoom:            2,
    zoomControl:     false,
    attributionControl: false,
  })

  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    { maxZoom: 19, subdomains: 'abcd' }
  ).addTo(leafletMap)

  // Sync Deck with Leaflet
  leafletMap.on('move', syncDeckView)
  leafletMap.on('zoom', syncDeckView)

  // Init Deck.gl
  const deckgl = await import('@deck.gl/core')
  const layers = await import('@deck.gl/layers')
  const aggLayers = await import('@deck.gl/aggregation-layers')

  _Deck           = deckgl.Deck
  _HeatmapLayer   = aggLayers.HeatmapLayer
  _ScatterplotLayer = layers.ScatterplotLayer
  _ArcLayer       = layers.ArcLayer
  _HexagonLayer   = aggLayers.HexagonLayer

  const center = leafletMap.getCenter()
  deckInstance = new _Deck({
    canvas:     canvasRef.value,
    width:      '100%',
    height:     '100%',
    controller: false,
    initialViewState: {
      longitude: center.lng,
      latitude:  center.lat,
      zoom:      leafletMap.getZoom() - 1,
      pitch:     0,
      bearing:   0,
    },
    layers: buildLayers(_HeatmapLayer, _ScatterplotLayer, _ArcLayer, _HexagonLayer),
    onWebGLInitialized: (gl) => {
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    },
  })
}

function syncDeckView() {
  if (!deckInstance || !leafletMap) return
  const center = leafletMap.getCenter()
  deckInstance.setProps({
    viewState: {
      longitude: center.lng,
      latitude:  center.lat,
      zoom:      leafletMap.getZoom() - 1,
      pitch:     0,
      bearing:   0,
    }
  })
}

function rebuildLayers() {
  if (!deckInstance || !_HeatmapLayer) return
  deckInstance.setProps({
    layers: buildLayers(_HeatmapLayer, _ScatterplotLayer, _ArcLayer, _HexagonLayer)
  })
}

function resizeDeck() {
  if (!deckInstance || !containerRef.value) return
  deckInstance.setProps({
    width:  containerRef.value.clientWidth,
    height: containerRef.value.clientHeight,
  })
  if (leafletMap) leafletMap.invalidateSize()
}

onMounted(async () => {
  await nextTick()
  await initDeck()
  roObserver = new ResizeObserver(() => resizeDeck())
  if (containerRef.value) roObserver.observe(containerRef.value)
})

onUnmounted(() => {
  if (roObserver) roObserver.disconnect()
  if (deckInstance) { try { deckInstance.finalize() } catch {} }
  if (leafletMap)   { try { leafletMap.remove()    } catch {} }
})

watch(() => store.filteredEvents, rebuildLayers, { deep: false })
</script>

<style scoped>
.deck-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: #0a0e1a;
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

/* Layer toggles */
.deck-controls {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
}
.layer-btn {
  padding: 4px 10px;
  background: rgba(13, 20, 36, 0.88);
  border: 1px solid #1e2d45;
  border-radius: 4px;
  color: #64748b;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.15s;
  backdrop-filter: blur(4px);
  white-space: nowrap;
}
.layer-btn:hover  { color: #94a3b8; border-color: #3b82f6; }
.layer-btn.active { color: #3b82f6; border-color: #3b82f6; background: rgba(59,130,246,0.12); }

/* Tooltip */
.deck-tooltip {
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
.tt-fatal   { font-size: 10px; color: #ef4444; margin-top: 3px; }
.tt-actors  { font-size: 9px;  color: #64748b; margin-top: 2px; }
.tt-source  { font-size: 9px;  color: #334155; margin-top: 4px; }

.tt-fade-enter-active, .tt-fade-leave-active { transition: opacity 0.1s; }
.tt-fade-enter-from, .tt-fade-leave-to { opacity: 0; }

/* Stats */
.deck-stats {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(13, 20, 36, 0.82);
  border: 1px solid #1e2d45;
  border-radius: 20px;
  padding: 4px 12px;
  backdrop-filter: blur(4px);
  z-index: 10;
  font-size: 10px;
}
.ds-label { color: #3b82f6; font-weight: 700; font-size: 9px; letter-spacing: 0.1em; }
.ds-sep   { color: #1e2d45; }
.ds-val   { font-weight: 700; font-family: 'JetBrains Mono', monospace; }
.ds-lbl   { color: #475569; }
.text-blue-400 { color: #60a5fa; }
</style>
