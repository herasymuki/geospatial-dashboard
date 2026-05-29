import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { fetchACLEDEvents } from "@/services/acled";
import { fetchUCDPConflicts } from "@/services/ucdp";
import { fetchGDELTEvents } from "@/services/gdelt";
import { fetchReliefWebCrises } from "@/services/reliefweb";
import { fetchRSS } from "@/services/rss";

export const useConflictsStore = defineStore("conflicts", () => {
  const acledEvents      = ref([]);
  const ucdpConflicts    = ref([]);
  const gdeltEvents      = ref([]);
  const reliefCrises     = ref([]);
  const newsItems        = ref([]);
  const loading          = ref(false);
  const errors           = ref([]);
  const selectedConflict = ref(null);
  const selectedRegion   = ref(null);
  const timeRange        = ref({ start: "2020-01-01", end: new Date().toISOString().slice(0,10) });
  const activeFilters    = ref({ fatalities: [0, 100000], types: [], regions: [] });
  const lastUpdated      = ref(null);

  // ── derived ─────────────────────────────────────────────────────────────────
  const allEvents = computed(() => {
    const a = acledEvents.value.map(e => ({
      id: `acled-${e.event_id_cnty || Math.random()}`,
      source: "ACLED",
      lat: parseFloat(e.latitude) || 0,
      lng: parseFloat(e.longitude) || 0,
      country: e.country || "Unknown",
      region: e.region || "Unknown",
      type: e.event_type || "Unknown",
      subtype: e.sub_event_type || "",
      fatalities: parseInt(e.fatalities) || 0,
      date: e.event_date || "",
      notes: e.notes || "",
      actor1: e.actor1 || "",
      actor2: e.actor2 || "",
      severity: severityScore(parseInt(e.fatalities) || 0)
    }));

    const u = ucdpConflicts.value.map(c => ({
      id: `ucdp-${c.id || Math.random()}`,
      source: "UCDP",
      lat: parseFloat(c.latitude) || 0,
      lng: parseFloat(c.longitude) || 0,
      country: c.country || "Unknown",
      region: c.region || "Unknown",
      type: c.type_of_violence_label || "Armed Conflict",
      subtype: c.conflict_name || "",
      fatalities: parseInt(c.best) || 0,
      date: c.date_start || "",
      notes: c.conflict_name || "",
      actor1: c.side_a || "",
      actor2: c.side_b || "",
      severity: severityScore(parseInt(c.best) || 0)
    }));

    return [...a, ...u].filter(e => e.lat !== 0 || e.lng !== 0);
  });

  const conflictsByCountry = computed(() => {
    const map = {};
    allEvents.value.forEach(e => {
      if (!map[e.country]) map[e.country] = { country: e.country, events: 0, fatalities: 0, lat: e.lat, lng: e.lng };
      map[e.country].events++;
      map[e.country].fatalities += e.fatalities;
    });
    return Object.values(map).sort((a,b) => b.fatalities - a.fatalities);
  });

  const topConflicts = computed(() => conflictsByCountry.value.slice(0, 10));

  const totalFatalities = computed(() => allEvents.value.reduce((s, e) => s + e.fatalities, 0));

  const activeConflictCount = computed(() => new Set(allEvents.value.map(e => e.country)).size);

  const eventsByType = computed(() => {
    const map = {};
    allEvents.value.forEach(e => {
      map[e.type] = (map[e.type] || 0) + 1;
    });
    return Object.entries(map).map(([type, count]) => ({ type, count })).sort((a,b) => b.count - a.count);
  });

  const eventsByMonth = computed(() => {
    const map = {};
    allEvents.value.forEach(e => {
      const m = (e.date || "").slice(0, 7);
      if (!m) return;
      if (!map[m]) map[m] = { month: m, events: 0, fatalities: 0 };
      map[m].events++;
      map[m].fatalities += e.fatalities;
    });
    return Object.values(map).sort((a,b) => a.month.localeCompare(b.month));
  });

  // ── helpers ──────────────────────────────────────────────────────────────────
  function severityScore(fatalities) {
    if (fatalities === 0) return "low";
    if (fatalities < 10)  return "medium";
    if (fatalities < 100) return "high";
    return "critical";
  }

  // ── actions ──────────────────────────────────────────────────────────────────
  async function fetchAll() {
    loading.value = true;
    errors.value  = [];
    const tasks = [
      fetchACLEDEvents().then(d => { acledEvents.value = d; }).catch(e => errors.value.push(`ACLED: ${e.message}`)),
      fetchUCDPConflicts().then(d => { ucdpConflicts.value = d; }).catch(e => errors.value.push(`UCDP: ${e.message}`)),
      fetchGDELTEvents().then(d => { gdeltEvents.value = d; }).catch(e => errors.value.push(`GDELT: ${e.message}`)),
      fetchReliefWebCrises().then(d => { reliefCrises.value = d; }).catch(e => errors.value.push(`ReliefWeb: ${e.message}`)),
      fetchRSS().then(d => { newsItems.value = d; }).catch(e => errors.value.push(`RSS: ${e.message}`)),
    ];
    await Promise.allSettled(tasks);
    lastUpdated.value = new Date().toISOString();
    loading.value = false;
  }

  function selectConflict(conflict) { selectedConflict.value = conflict; }
  function clearSelection()         { selectedConflict.value = null; }
  function setRegion(region)        { selectedRegion.value = region; }
  function setTimeRange(range)      { timeRange.value = range; }

  return {
    acledEvents, ucdpConflicts, gdeltEvents, reliefCrises, newsItems,
    loading, errors, selectedConflict, selectedRegion, timeRange, activeFilters, lastUpdated,
    allEvents, conflictsByCountry, topConflicts, totalFatalities, activeConflictCount,
    eventsByType, eventsByMonth,
    fetchAll, selectConflict, clearSelection, setRegion, setTimeRange
  };
});
