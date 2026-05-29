<template>
  <div class="detail-drawer">
    <div class="detail-panel">
      <button class="detail-close" @click="store.clearSelection()"><i class="fa-solid fa-xmark"></i></button>

      <div class="detail-header">
        <div class="detail-severity" :class="`sev-${c.severity}`">
          {{ c.severity?.toUpperCase() }}
        </div>
        <h2 class="detail-country">{{ c.country }}</h2>
        <div class="detail-source-badge">{{ c.source }}</div>
      </div>

      <div class="detail-meta">
        <div class="meta-item">
          <span class="meta-label"><i class="fa-solid fa-calendar-days"></i> Date</span>
          <span class="meta-value">{{ c.date }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label"><i class="fa-solid fa-shield-halved"></i> Type</span>
          <span class="meta-value">{{ c.type }}</span>
        </div>
        <div class="meta-item" v-if="c.subtype">
          <span class="meta-label"><i class="fa-solid fa-magnifying-glass"></i> Sub-type</span>
          <span class="meta-value">{{ c.subtype }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label"><i class="fa-solid fa-skull"></i> Fatalities</span>
          <span class="meta-value text-red">{{ c.fatalities.toLocaleString() }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label"><i class="fa-solid fa-location-dot"></i> Region</span>
          <span class="meta-value">{{ c.region }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label"><i class="fa-solid fa-location-crosshairs"></i> Coordinates</span>
          <span class="meta-value mono">{{ c.lat?.toFixed(4) }}, {{ c.lng?.toFixed(4) }}</span>
        </div>
      </div>

      <div class="detail-actors" v-if="c.actor1 || c.actor2">
        <h4>Parties Involved</h4>
        <div class="actors-row">
          <div class="actor-card" v-if="c.actor1">
            <span class="actor-icon"><i class="fa-solid fa-circle" style="color:#ef4444"></i></span>
            <span>{{ c.actor1 }}</span>
          </div>
          <div class="actor-vs" v-if="c.actor1 && c.actor2">vs</div>
          <div class="actor-card" v-if="c.actor2">
            <span class="actor-icon"><i class="fa-solid fa-circle" style="color:#3b82f6"></i></span>
            <span>{{ c.actor2 }}</span>
          </div>
        </div>
      </div>

      <div class="detail-notes" v-if="c.notes">
        <h4><i class="fa-solid fa-clipboard-list"></i> Notes</h4>
        <p>{{ c.notes }}</p>
      </div>

      <!-- Related events in same country -->
      <div class="detail-related" v-if="relatedEvents.length > 1">
        <h4><i class="fa-solid fa-folder-open"></i> Other Events in {{ c.country }} ({{ relatedEvents.length }})</h4>
        <div class="related-list">
          <div v-for="e in relatedEvents.slice(0,5)" :key="e.id" class="related-item"
               @click="store.selectConflict(e)">
            <span class="related-date">{{ e.date }}</span>
            <span class="related-type">{{ e.type }}</span>
            <span class="related-fatal text-red">{{ e.fatalities }} <i class="fa-solid fa-skull"></i></span>
          </div>
        </div>
      </div>

      <!-- Related news -->
      <div class="detail-news" v-if="relatedNews.length">
        <h4><i class="fa-solid fa-newspaper"></i> Related News</h4>
        <a v-for="n in relatedNews.slice(0,3)" :key="n.id" :href="n.url" target="_blank" class="related-news-item">
          <div class="rn-source">{{ n.source }}</div>
          <div class="rn-title">{{ n.title }}</div>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useConflictsStore } from "@/stores/conflicts";

const store = useConflictsStore();
const c = computed(() => store.selectedConflict || {});

const relatedEvents = computed(() =>
  store.allEvents.filter(e => e.country === c.value.country)
    .sort((a,b) => b.fatalities - a.fatalities)
);

const relatedNews = computed(() => {
  const country = c.value.country?.toLowerCase() || "";
  return store.newsItems.filter(n =>
    n.title?.toLowerCase().includes(country) ||
    n.description?.toLowerCase().includes(country)
  );
});
</script>
