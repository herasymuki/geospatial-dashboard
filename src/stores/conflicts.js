import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { fetchUCDPConflicts }   from "@/services/ucdp";
import { fetchGDELTEvents }     from "@/services/gdelt";
import { fetchGDACSAlerts }     from "@/services/gdacs";
import { fetchWikidataConflicts } from "@/services/wikidata";
import { fetchUNHCRFlows }      from "@/services/unhcr";
import { fetchRSS }             from "@/services/rss";

export const useConflictsStore = defineStore("conflicts", () => {

  // ── Raw data refs ──────────────────────────────────────────────────────────
  const ucdpConflicts    = ref([]);
  const gdeltEvents      = ref([]);
  const gdacsAlerts      = ref([]);
  const wikidataConflicts = ref([]);
  const unhcrFlows       = ref({ arcs: [], idpPoints: [], totalRefugees: 0, totalIDPs: 0 });
  const newsItems        = ref([]);

  // ── UI state ───────────────────────────────────────────────────────────────
  const loading          = ref(false);
  const errors           = ref([]);
  const selectedConflict = ref(null);
  const lastUpdated      = ref(null);

  // ── Filter state (fully reactive, wired to allEvents) ─────────────────────
  const filterTypes      = ref([]);   // e.g. ["State-based conflict", "Non-state conflict"]
  const filterSources    = ref([]);   // e.g. ["UCDP", "GDACS", "Wikidata"]
  const filterMinFatalities = ref(0);
  const filterDateFrom   = ref("2010-01-01");
  const filterDateTo     = ref(new Date().toISOString().slice(0, 10));
  const filterRegions    = ref([]);   // e.g. ["Africa", "Middle East"]

  // ── Normalize all event sources into a unified schema ─────────────────────
  const allEventsRaw = computed(() => {
    // UCDP typeOfViolence integer → label (standard UCDP coding)
    const ucdpTypeLabel = (v) => {
      const n = parseInt(v);
      if (n === 1) return "State-based conflict";
      if (n === 2) return "Non-state conflict";
      if (n === 3) return "One-sided violence";
      return v || "Armed Conflict";
    };

    const u = ucdpConflicts.value.map(c => {
      // Support both snake_case (mock/API) and camelCase (CSV proxy) field names
      const fatalities  = parseInt(c.best ?? c.deaths) || 0;
      const date        = c.date_start ?? c.dateStart ?? "";
      const typeLabel   = c.type_of_violence_label ?? ucdpTypeLabel(c.typeOfViolence);
      const conflictName = c.conflict_name ?? c.conflictName ?? "";
      const actor1      = c.side_a ?? c.sideA ?? "";
      const actor2      = c.side_b ?? c.sideB ?? "";
      const region      = c.region ?? regionFromCountry(c.country);
      return {
        id: `ucdp-${c.id || Math.random()}`,
        source: "UCDP",
        lat: parseFloat(c.latitude) || 0,
        lng: parseFloat(c.longitude) || 0,
        country: c.country || "Unknown",
        region,
        type: typeLabel,
        subtype: conflictName,
        fatalities,
        date,
        notes: conflictName,
        actor1,
        actor2,
        severity: severityScore(fatalities)
      };
    });

    const g = gdacsAlerts.value.map(a => ({
      id: a.id,
      source: "GDACS",
      lat: a.lat || 0,
      lng: a.lng || 0,
      country: a.country || "Unknown",
      region: regionFromCountry(a.country),
      type: a.eventType || "Alert",
      subtype: a.alertLevel || "",
      fatalities: 0,
      date: a.date || "",
      notes: a.description || a.title || "",
      actor1: "GDACS Alert",
      actor2: "",
      severity: alertLevelToSeverity(a.alertLevel),
      url: a.url
    }));

    const w = wikidataConflicts.value.map(c => ({
      id: c.id,
      source: "Wikidata",
      lat: c.lat || 0,
      lng: c.lng || 0,
      country: c.country || "Unknown",
      region: regionFromCountry(c.country),
      type: c.status === "ongoing" ? "Ongoing Conflict" : "Resolved Conflict",
      subtype: c.name || "",
      fatalities: c.casualties || 0,
      date: c.startDate || "",
      notes: c.name || "",
      actor1: "",
      actor2: "",
      severity: severityScore(c.casualties || 0),
      wikiUrl: c.wikiUrl,
      status: c.status
    }));

    return [...u, ...g, ...w].filter(e => e.lat !== 0 || e.lng !== 0);
  });

  // ── Filtered events (all filters applied reactively) ──────────────────────
  const allEvents = computed(() => {
    let events = allEventsRaw.value;

    if (filterTypes.value.length > 0) {
      events = events.filter(e => filterTypes.value.includes(e.type));
    }
    if (filterSources.value.length > 0) {
      events = events.filter(e => filterSources.value.includes(e.source));
    }
    if (filterMinFatalities.value > 0) {
      events = events.filter(e => e.fatalities >= filterMinFatalities.value);
    }
    if (filterRegions.value.length > 0) {
      events = events.filter(e => filterRegions.value.includes(e.region));
    }
    if (filterDateFrom.value) {
      events = events.filter(e => !e.date || e.date >= filterDateFrom.value);
    }
    if (filterDateTo.value) {
      events = events.filter(e => !e.date || e.date <= filterDateTo.value);
    }

    return events;
  });

  // ── Derived / aggregated computeds ────────────────────────────────────────
  const conflictsByCountry = computed(() => {
    const map = {};
    allEvents.value.forEach(e => {
      if (!map[e.country]) map[e.country] = { country: e.country, events: 0, fatalities: 0, lat: e.lat, lng: e.lng };
      map[e.country].events++;
      map[e.country].fatalities += e.fatalities;
    });
    return Object.values(map).sort((a, b) => b.fatalities - a.fatalities);
  });

  const topConflicts       = computed(() => conflictsByCountry.value.slice(0, 10));
  const totalFatalities    = computed(() => allEvents.value.reduce((s, e) => s + e.fatalities, 0));
  const activeConflictCount = computed(() => new Set(allEvents.value.map(e => e.country)).size);
  const totalRefugees      = computed(() => unhcrFlows.value.totalRefugees || 0);
  const totalIDPs          = computed(() => unhcrFlows.value.totalIDPs || 0);

  const eventsByType = computed(() => {
    const map = {};
    allEvents.value.forEach(e => { map[e.type] = (map[e.type] || 0) + 1; });
    return Object.entries(map).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
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
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  });

  const eventsByRegion = computed(() => {
    const map = {};
    allEvents.value.forEach(e => {
      const r = e.region || "Unknown";
      if (!map[r]) map[r] = { region: r, events: 0, fatalities: 0 };
      map[r].events++;
      map[r].fatalities += e.fatalities;
    });
    return Object.values(map).sort((a, b) => b.events - a.events);
  });

  // Available filter options derived from raw data
  const availableTypes   = computed(() => [...new Set(allEventsRaw.value.map(e => e.type))].filter(Boolean).sort());
  const availableSources = computed(() => [...new Set(allEventsRaw.value.map(e => e.source))].filter(Boolean).sort());
  const availableRegions = computed(() => [...new Set(allEventsRaw.value.map(e => e.region))].filter(Boolean).sort());

  // ── Helpers ────────────────────────────────────────────────────────────────
  function severityScore(fatalities) {
    if (fatalities === 0)     return "low";
    if (fatalities < 100)     return "medium";
    if (fatalities < 10000)   return "high";
    return "critical";
  }

  function alertLevelToSeverity(level) {
    if (!level) return "low";
    const l = level.toLowerCase();
    if (l === "red")    return "critical";
    if (l === "orange") return "high";
    if (l === "green")  return "low";
    return "medium";
  }

  function regionFromCountry(country) {
    if (!country) return "Unknown";
    const c = country.toLowerCase();
    if (["ukraine","russia","poland","germany","france","uk","serbia","hungary","romania","croatia","albania","moldova","belarus"].some(x => c.includes(x))) return "Europe";
    if (["syria","iraq","yemen","israel","palestine","lebanon","jordan","iran","saudi","kuwait","qatar","uae","oman","bahrain","turkey"].some(x => c.includes(x))) return "Middle East";
    if (["nigeria","sudan","ethiopia","somalia","mali","drc","congo","kenya","mozambique","burkina","niger","chad","cameroon","angola","zimbabwe","south africa","ghana","senegal","guinea","ivory","liberia","sierra","togo","benin","rwanda","burundi","tanzania","uganda","zambia","malawi","eritrea","djibouti","central african"].some(x => c.includes(x))) return "Africa";
    if (["afghanistan","pakistan","india","myanmar","bangladesh","sri lanka","nepal","bhutan"].some(x => c.includes(x))) return "South Asia";
    if (["china","north korea","south korea","japan","taiwan","vietnam","laos","cambodia","thailand","indonesia","philippines","malaysia"].some(x => c.includes(x))) return "East/SE Asia";
    if (["colombia","venezuela","mexico","brazil","peru","bolivia","ecuador","haiti","honduras","guatemala","el salvador"].some(x => c.includes(x))) return "Americas";
    if (["libya","egypt","tunisia","algeria","morocco"].some(x => c.includes(x))) return "North Africa";
    return "Other";
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  async function fetchAll() {
    loading.value = true;
    errors.value  = [];

    const tasks = [
      fetchUCDPConflicts()
        .then(d => { ucdpConflicts.value = d; })
        .catch(e => errors.value.push(`UCDP: ${e.message}`)),

      fetchGDELTEvents()
        .then(d => { gdeltEvents.value = d; })
        .catch(e => errors.value.push(`GDELT: ${e.message}`)),

      fetchGDACSAlerts()
        .then(d => { gdacsAlerts.value = d; })
        .catch(e => errors.value.push(`GDACS: ${e.message}`)),

      fetchWikidataConflicts()
        .then(d => { wikidataConflicts.value = d; })
        .catch(e => errors.value.push(`Wikidata: ${e.message}`)),

      fetchUNHCRFlows()
        .then(d => { unhcrFlows.value = d; })
        .catch(e => errors.value.push(`UNHCR: ${e.message}`)),

      fetchRSS()
        .then(d => { newsItems.value = d; })
        .catch(e => errors.value.push(`RSS: ${e.message}`)),
    ];

    await Promise.allSettled(tasks);
    lastUpdated.value = new Date().toISOString();
    loading.value = false;
  }

  function selectConflict(conflict) { selectedConflict.value = conflict; }
  function clearSelection()         { selectedConflict.value = null; }

  function resetFilters() {
    filterTypes.value         = [];
    filterSources.value       = [];
    filterMinFatalities.value = 0;
    filterDateFrom.value      = "2010-01-01";
    filterDateTo.value        = new Date().toISOString().slice(0, 10);
    filterRegions.value       = [];
  }

  return {
    // raw data
    ucdpConflicts, gdeltEvents, gdacsAlerts, wikidataConflicts, unhcrFlows, newsItems,
    // ui state
    loading, errors, selectedConflict, lastUpdated,
    // filters
    filterTypes, filterSources, filterMinFatalities, filterDateFrom, filterDateTo, filterRegions,
    availableTypes, availableSources, availableRegions,
    // computed
    allEvents, allEventsRaw, conflictsByCountry, topConflicts,
    totalFatalities, activeConflictCount, totalRefugees, totalIDPs,
    eventsByType, eventsByMonth, eventsByRegion,
    // actions
    fetchAll, selectConflict, clearSelection, resetFilters
  };
});
