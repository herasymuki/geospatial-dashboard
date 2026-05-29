<template>
  <div class="heatmap-container" ref="containerRef">
    <canvas ref="canvasRef" class="deck-canvas"></canvas>
    <div class="heatmap-controls">
      <label>Intensity
        <input type="range" min="1" max="20" v-model.number="intensity" @input="updateLayer" />
        {{ intensity }}
      </label>
      <label>Radius
        <input type="range" min="10" max="100" v-model.number="radius" @input="updateLayer" />
        {{ radius }}km
      </label>
      <label>Threshold
        <input type="range" min="0.01" max="0.5" step="0.01" v-model.number="threshold" @input="updateLayer" />
        {{ threshold }}
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useConflictsStore } from "@/stores/conflicts";

const store = useConflictsStore();
const containerRef = ref(null);
const canvasRef = ref(null);
const intensity = ref(5);
const radius = ref(40);
const threshold = ref(0.05);

let deckInstance = null;

async function initDeck() {
  const { Deck } = await import("@deck.gl/core");
  const container = containerRef.value;
  if (!container) return;

  deckInstance = new Deck({
    canvas: canvasRef.value,
    width: container.clientWidth,
    height: container.clientHeight,
    initialViewState: { longitude: 20, latitude: 15, zoom: 1.8, pitch: 0, bearing: 0 },
    controller: true,
    layers: [],
    style: { background: "#050a14" }
  });

  updateLayer();
}

async function updateLayer() {
  if (!deckInstance) return;
  const events = store.allEvents;
  if (!events.length) return;

  const { HeatmapLayer } = await import("@deck.gl/aggregation-layers");

  const layer = new HeatmapLayer({
    id: "heatmap",
    data: events,
    getPosition: d => [d.lng, d.lat],
    getWeight: d => Math.max(1, Math.log1p(d.fatalities) * 2),
    intensity: intensity.value,
    radiusPixels: radius.value,
    threshold: threshold.value,
    colorRange: [
      [0, 0, 80, 0],
      [0, 100, 200, 120],
      [0, 200, 255, 180],
      [255, 200, 0, 200],
      [255, 100, 0, 220],
      [255, 0, 50, 255],
    ],
  });

  deckInstance.setProps({ layers: [layer] });
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

watch(() => store.allEvents, () => updateLayer(), { deep: false });
</script>
