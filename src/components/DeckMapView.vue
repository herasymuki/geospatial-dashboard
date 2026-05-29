<template>
  <div class="deckmap-container" ref="containerRef">
    <canvas ref="canvasRef" class="deck-canvas"></canvas>
    <div class="deck-controls">
      <button @click="resetView">⌂ Reset</button>
      <select v-model="activeLayer" class="layer-select">
        <option value="scatter">Scatter Plot</option>
        <option value="hexagon">Hexagon Aggregation</option>
        <option value="arc">Arc Connections</option>
        <option value="grid">Grid Aggregation</option>
      </select>
    </div>
    <div class="deck-tooltip" v-if="deckTooltip.visible"
         :style="{ left: deckTooltip.x + 'px', top: deckTooltip.y + 'px' }">
      <div v-if="deckTooltip.object">
        <div class="tt-country">{{ deckTooltip.object.country || deckTooltip.object.points?.length + ' events' }}</div>
        <div v-if="deckTooltip.object.fatalities !== undefined">💀 {{ deckTooltip.object.fatalities }} fatalities</div>
        <div v-if="deckTooltip.object.type">{{ deckTooltip.object.type }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useConflictsStore } from "@/stores/conflicts";

const store = useConflictsStore();
const containerRef = ref(null);
const canvasRef = ref(null);
const activeLayer = ref("scatter");
const deckTooltip = ref({ visible: false, x: 0, y: 0, object: null });

let deckInstance = null;

const SEVERITY_COLORS = {
  critical: [255, 23, 68, 220],
  high:     [255, 109, 0, 200],
  medium:   [255, 214, 0, 180],
  low:      [0, 229, 255, 160],
};

async function initDeck() {
  const { Deck } = await import("@deck.gl/core");
  const container = containerRef.value;
  if (!container) return;

  deckInstance = new Deck({
    canvas: canvasRef.value,
    width: container.clientWidth,
    height: container.clientHeight,
    initialViewState: {
      longitude: 20,
      latitude: 15,
      zoom: 1.8,
      pitch: 45,
      bearing: 0
    },
    controller: true,
    onViewStateChange: ({ viewState }) => {
      if (deckInstance) deckInstance.setProps({ viewState });
    },
    getTooltip: ({ object }) => null,
    onHover: ({ object, x, y }) => {
      deckTooltip.value = { visible: !!object, x, y, object };
    },
    onClick: ({ object }) => {
      if (object && object.country) store.selectConflict(object);
    },
    layers: [],
    style: { background: "#050a14" }
  });

  updateLayers();
}

async function updateLayers() {
  if (!deckInstance) return;
  const events = store.allEvents;
  if (!events.length) return;

  const { ScatterplotLayer } = await import("@deck.gl/layers");
  const { HexagonLayer, GridLayer } = await import("@deck.gl/aggregation-layers");
  const { ArcLayer } = await import("@deck.gl/layers");

  let layers = [];

  if (activeLayer.value === "scatter") {
    layers = [new ScatterplotLayer({
      id: "scatter",
      data: events,
      getPosition: d => [d.lng, d.lat],
      getRadius: d => {
        const f = d.fatalities;
        if (f === 0) return 30000;
        if (f < 10)  return 60000;
        if (f < 100) return 120000;
        return Math.min(400000, 120000 + f * 500);
      },
      getFillColor: d => SEVERITY_COLORS[d.severity] || [0, 229, 255, 160],
      getLineColor: [255, 255, 255, 40],
      lineWidthMinPixels: 1,
      pickable: true,
      radiusMinPixels: 3,
      radiusMaxPixels: 40,
    })];
  } else if (activeLayer.value === "hexagon") {
    layers = [new HexagonLayer({
      id: "hexagon",
      data: events,
      getPosition: d => [d.lng, d.lat],
      getElevationWeight: d => Math.max(1, d.fatalities),
      getColorWeight: d => Math.max(1, d.fatalities),
      elevationScale: 500,
      radius: 150000,
      extruded: true,
      pickable: true,
      colorRange: [
        [0, 229, 255, 180],
        [0, 150, 255, 200],
        [255, 214, 0, 200],
        [255, 109, 0, 220],
        [255, 23, 68, 240],
        [180, 0, 50, 255],
      ],
    })];
  } else if (activeLayer.value === "arc") {
    const top = store.conflictsByCountry.slice(0, 15);
    const arcs = [];
    for (let i = 0; i < top.length - 1; i++) {
      arcs.push({ source: top[i], target: top[i+1] });
    }
    layers = [
      new ScatterplotLayer({
        id: "arc-points",
        data: events,
        getPosition: d => [d.lng, d.lat],
        getRadius: 40000,
        getFillColor: d => SEVERITY_COLORS[d.severity] || [0, 229, 255, 160],
        pickable: true,
        radiusMinPixels: 2,
      }),
      new ArcLayer({
        id: "arcs",
        data: arcs,
        getSourcePosition: d => [d.source.lng, d.source.lat],
        getTargetPosition: d => [d.target.lng, d.target.lat],
        getSourceColor: [255, 23, 68, 180],
        getTargetColor: [255, 109, 0, 180],
        getWidth: 1.5,
        pickable: false,
      })
    ];
  } else if (activeLayer.value === "grid") {
    layers = [new GridLayer({
      id: "grid",
      data: events,
      getPosition: d => [d.lng, d.lat],
      getElevationWeight: d => Math.max(1, d.fatalities),
      elevationScale: 300,
      cellSize: 200000,
      extruded: true,
      pickable: true,
      colorRange: [
        [0, 229, 255, 180],
        [0, 150, 255, 200],
        [255, 214, 0, 200],
        [255, 109, 0, 220],
        [255, 23, 68, 240],
        [180, 0, 50, 255],
      ],
    })];
  }

  deckInstance.setProps({ layers });
}

function resetView() {
  if (deckInstance) {
    deckInstance.setProps({
      viewState: { longitude: 20, latitude: 15, zoom: 1.8, pitch: 45, bearing: 0, transitionDuration: 1000 }
    });
  }
}

function handleResize() {
  if (deckInstance && containerRef.value) {
    deckInstance.setProps({
      width: containerRef.value.clientWidth,
      height: containerRef.value.clientHeight
    });
  }
}

onMounted(() => {
  initDeck();
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
  if (deckInstance) deckInstance.finalize();
});

watch(() => store.allEvents, () => updateLayers(), { deep: false });
watch(activeLayer, () => updateLayers());
</script>
