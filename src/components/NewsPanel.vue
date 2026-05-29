<template>
  <div class="panel news-panel">
    <h3 class="panel-title"><i class="fa-solid fa-satellite-dish"></i> Live Intelligence Feed</h3>
    <div class="news-list">
      <div v-if="store.newsItems.length === 0 && !store.loading" class="news-empty">
        No news items loaded
      </div>
      <a
        v-for="item in displayedNews"
        :key="item.id"
        :href="item.url"
        target="_blank"
        rel="noopener"
        class="news-item"
      >
        <div class="news-source">{{ item.source }}</div>
        <div class="news-title">{{ item.title }}</div>
        <div class="news-date">{{ formatDate(item.date) }}</div>
      </a>
    </div>
    <button v-if="store.newsItems.length > 5" class="show-more-btn" @click="showAll = !showAll">
      {{ showAll ? "Show less" : `Show all ${store.newsItems.length}` }}
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useConflictsStore } from "@/stores/conflicts";

const store = useConflictsStore();
const showAll = ref(false);

const displayedNews = computed(() =>
  showAll.value ? store.newsItems : store.newsItems.slice(0, 5)
);

function formatDate(d) {
  if (!d) return "";
  try {
    const date = new Date(d.length === 8 ? `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}` : d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return d; }
}
</script>
