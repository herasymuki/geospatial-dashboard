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

function buildLayers(
  HeatmapLayer, ScatterplotLayer, ArcLayer, HexagonLayer
) {
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
      onClick: ({ object }) => { if (object) store.selectEvent(object) },
    }))
  }

  if (activeLayers.arcs && store.arcData.length) {
    layers.push(new ArcLayer({
      id:             'arcs',
      data:           store.arcData,
      getSourcePosition: d => [d.startLng, d.startLat],
      getTargetPosition: d => [d.endLng,   d.endLat],
      getSourceColor:    [239, 68,  68,  160],
      getTargetColor:    [245, 158, 11,  160],
      getWidth:          d => Math.max(1, Math.min(4, (d.value || 0) / 50)),
      widthMinPixels:    1,
      pickable:          false,
    }))
  }

  if (activeLayers.hexagon && evts.length) {
    layers.push(new HexagonLayer({
      id:              'hexagon',
      data:            evts,
      getPosition:     d => [d.lng, d.lat],
      getElevationWeight: d => d.fatalities + 1,
      elevationScale:  200,
      extruded:        true,
      radius:          80000,
      coverage:        0.85,
      colorRange: [
        [1,   152, 189],
        [73,  227, 206],
        [216, 254, 181],
        [254, 237, 177],
        [254, 173, 84],
        [209, 55,  78],
      ],
      pickable:        true,
      onHover: ({ object, x, y }) => {
        if (object) {
          tooltip.visible = true
          tooltip.x = x + 14
          tooltip.y = y + 14
          tooltip.data = {
            type:       `Hexagon cluster`,
            country:    `${object.points?.length || 0} events`,
            date:       '',
            fatalities: object.points?.reduce((s, p) => s + (p.source?.fatalities || 0), 0) || 0,
            source:     'Aggregated',
            actor1:     '',
          }
        } else {
          tooltip.visible = false
        }
      },
    }))
  }

  return layers
}

let LayerClasses = null

async function rebuildLayers() {
  if (!deckInstance || !LayerClasses) return
  const { HeatmapLayer, ScatterplotLayer, ArcLayer, HexagonLayer } = LayerClasses
  deckInstance.setProps({ layers: buildLayers(HeatmapLayer, ScatterplotLayer, ArcLayer, HexagonLayer) })
}

onMounted(async () => {
  await nextTick()

  // ── Leaflet dark base map ─────────────────────────────────────────────────
  const L = (await import('leaflet')).default
  leafletMap = L.map(mapRef.value, {
    center:           [20, 10],
    zoom:             2,
    zoomControl:      false,
    attributionControl: false,
  })
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd',
  }).addTo(leafletMap)

  // ── Deck.gl ───────────────────────────────────────────────────────────────
  const { Deck }          = await import('@deck.gl/core')
  const { ScatterplotLayer, ArcLayer } = await import('@deck.gl/layers')
  const { HeatmapLayer, HexagonLayer } = await import('@deck.gl/aggregation-layers')

  LayerClasses = { HeatmapLayer, ScatterplotLayer, ArcLayer, HexagonLayer }

  const getViewState = () => {
    const c = leafletMap.getCenter()
    return {
      longitude: c.lng,
      latitude:  c.lat,
      zoom:      leafletMap.getZoom() - 1,
      pitch:     0,
      bearing:   0,
    }
  }

  deckInstance = new Deck({
    canvas:           canvasRef.value,
    width:            '100%',
    height:           '100%',
    controller:       false,
    initialViewState: getViewState(),
    layers:           buildLayers(HeatmapLayer, ScatterplotLayer, ArcLayer, HexagonLayer),
    getTooltip:       null,
  })

  leafletMap.on('move zoom', () => {
    deckInstance?.setProps({ viewState: getViewState() })
  })

  roObserver = new ResizeObserver(() => {
    if (containerRef.value) {
      leafletMap?.invalidateSize()
    }
  })
  roObserver.observe(containerRef.value)
})

onUnmounted(() => {
  roObserver?.disconnect()
  deckInstance?.finalize()
  leafletMap?.remove()
})

watch(
  () => [store.filteredEvents, store.arcData],
  () => rebuildLayers(),
  { deep: false }
)
</script>

<style scoped>
.deck-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0a0e1a;
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
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
}
.layer-btn {
  padding: 4px 10px;
  background: rgba(13,20,36,0.9);
  border: 1px solid #1e2d45;
  border-radius: 4px;
  color: #64748b;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.15s;
  backdrop-filter: blur(4px);
  white-space: nowrap;
}
.layer-btn:hover { color: #94a3b8; }
.layer-btn.active { color: #3b82f6; border-color: rgba(59,130,246,0.4); background: rgba(59,130,246,0.1); }

.deck-tooltip {
  position: absolute;
  background: rgba(13,20,36,0.95);
  border: 1px solid #1e2d45;
  border-radius: 6px;
  padding: 8px 12px;
  pointer-events: none;
  z-index: 20;
  max-width: 220px;
  backdrop-filter: blur(4px);
}
.tt-type    { font-size: 12px; font-weight: 600; color: #e2e8f0; margin-bottom: 3px; }
.tt-country { font-size: 10px; color: #64748b; margin-bottom: 2px; }
.tt-fatal   { font-size: 10px; color: #ef4444; margin-bottom: 2px; }
.tt-actors  { font-size: 10px; color: #94a3b8; margin-bottom: 2px; }
.tt-source  { font-size: 9px;  color: #475569; }

.deck-stats {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(13,20,36,0.85);
  border: 1px solid #1e2d45;
  border-radius: 6px;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  backdrop-filter: blur(4px);
  z-index: 10;
}
.ds-label { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; color: #3b82f6; }
.ds-sep   { color: #1e2d45; }
.ds-val   { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; }
.ds-lbl   { color: #475569; font-size: 9px; }

.tt-fade-enter-active, .tt-fade-leave-active { transition: opacity 0.1s; }
.tt-fade-enter-from, .tt-fade-leave-to { opacity: 0; }
</style>
