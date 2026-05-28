import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchACLEDEvents, fetchUCDPConflicts, fetchGDELTEvents, fetchReliefWebCrises } from '@/services/dataService'

export const useConflictsStore = defineStore('conflicts', () => {
  // ── Raw data ──────────────────────────────────────────────────────────────
  const acledEvents     = ref([])
  const ucdpConflicts   = ref([])
  const gdeltEvents     = ref([])
  const reliefWebCrises = ref([])

  // ── UI state ──────────────────────────────────────────────────────────────
  const loading         = ref(false)
  const error           = ref(null)
  const selectedEvent   = ref(null)
  const selectedCountry = ref(null)
  const activeView      = ref('globe')   // 'globe' | 'deck' | 'split'

  // ── Filters ───────────────────────────────────────────────────────────────
  const filters = ref({
    dateFrom:    '2020-01-01',
    dateTo:      new Date().toISOString().slice(0, 10),
    eventTypes:  [],
    minFatalities: 0,
    sources:     { acled: true, ucdp: true, gdelt: true, reliefweb: true },
    countries:   []
  })

  // ── Merged / normalised events ────────────────────────────────────────────
  const allEvents = computed(() => {
    const events = []

    acledEvents.value.forEach(e => {
      if (!e.latitude || !e.longitude) return
      events.push({
        id:         `acled-${e.data_id}`,
        source:     'ACLED',
        lat:        parseFloat(e.latitude),
        lng:        parseFloat(e.longitude),
        country:    e.country,
        date:       e.event_date,
        type:       e.event_type,
        subtype:    e.sub_event_type,
        fatalities: parseInt(e.fatalities) || 0,
        actor1:     e.actor1,
        actor2:     e.actor2,
        notes:      e.notes,
        severity:   severityFromFatalities(parseInt(e.fatalities) || 0),
        color:      colorByType(e.event_type)
      })
    })

    ucdpConflicts.value.forEach(c => {
      if (!c.latitude || !c.longitude) return
      events.push({
        id:         `ucdp-${c.id}`,
        source:     'UCDP',
        lat:        parseFloat(c.latitude),
        lng:        parseFloat(c.longitude),
        country:    c.country,
        date:       c.date_start,
        type:       c.type_of_violence_label || 'Armed Conflict',
        subtype:    c.dyad_name,
        fatalities: parseInt(c.best) || 0,
        actor1:     c.side_a,
        actor2:     c.side_b,
        notes:      c.source_article,
        severity:   severityFromFatalities(parseInt(c.best) || 0),
        color:      [245, 158, 11]
      })
    })

    gdeltEvents.value.forEach(e => {
      if (!e.ActionGeo_Lat || !e.ActionGeo_Long) return
      events.push({
        id:         `gdelt-${e.GLOBALEVENTID}`,
        source:     'GDELT',
        lat:        parseFloat(e.ActionGeo_Lat),
        lng:        parseFloat(e.ActionGeo_Long),
        country:    e.ActionGeo_CountryCode,
        date:       e.SQLDATE?.toString().replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3'),
        type:       e.EventCode ? `CAMEO:${e.EventCode}` : 'Event',
        subtype:    e.EventBaseCode,
        fatalities: 0,
        actor1:     e.Actor1Name,
        actor2:     e.Actor2Name,
        notes:      e.SOURCEURL,
        severity:   'low',
        color:      [6, 182, 212]
      })
    })

    return events
  })

  const filteredEvents = computed(() => {
    return allEvents.value.filter(e => {
      if (!filters.value.sources[e.source.toLowerCase()]) return false
      if (e.fatalities < filters.value.minFatalities) return false
      if (filters.value.countries.length && !filters.value.countries.includes(e.country)) return false
      if (filters.value.eventTypes.length && !filters.value.eventTypes.includes(e.type)) return false
      if (e.date < filters.value.dateFrom || e.date > filters.value.dateTo) return false
      return true
    })
  })

  const stats = computed(() => ({
    totalEvents:     filteredEvents.value.length,
    totalFatalities: filteredEvents.value.reduce((s, e) => s + e.fatalities, 0),
    countries:       [...new Set(filteredEvents.value.map(e => e.country))].length,
    activeConflicts: ucdpConflicts.value.length,
    highSeverity:    filteredEvents.value.filter(e => e.severity === 'high').length,
  }))

  const eventsByCountry = computed(() => {
    const map = {}
    filteredEvents.value.forEach(e => {
      if (!map[e.country]) map[e.country] = { count: 0, fatalities: 0, events: [] }
      map[e.country].count++
      map[e.country].fatalities += e.fatalities
      map[e.country].events.push(e)
    })
    return map
  })

  const timelineData = computed(() => {
    const byDate = {}
    filteredEvents.value.forEach(e => {
      const month = e.date?.slice(0, 7)
      if (!month) return
      if (!byDate[month]) byDate[month] = { date: month, count: 0, fatalities: 0 }
      byDate[month].count++
      byDate[month].fatalities += e.fatalities
    })
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
  })

  // ── Actions ───────────────────────────────────────────────────────────────
  async function loadAllData() {
    loading.value = true
    error.value   = null
    try {
      const [acled, ucdp, gdelt, relief] = await Promise.allSettled([
        fetchACLEDEvents(filters.value),
        fetchUCDPConflicts(filters.value),
        fetchGDELTEvents(filters.value),
        fetchReliefWebCrises(filters.value)
      ])
      if (acled.status     === 'fulfilled') acledEvents.value     = acled.value
      if (ucdp.status      === 'fulfilled') ucdpConflicts.value   = ucdp.value
      if (gdelt.status     === 'fulfilled') gdeltEvents.value     = gdelt.value
      if (relief.status    === 'fulfilled') reliefWebCrises.value = relief.value
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  function selectEvent(event) { selectedEvent.value = event }
  function selectCountry(country) { selectedCountry.value = country }
  function setActiveView(view) { activeView.value = view }
  function updateFilters(patch) { Object.assign(filters.value, patch) }

  return {
    acledEvents, ucdpConflicts, gdeltEvents, reliefWebCrises,
    loading, error, selectedEvent, selectedCountry, activeView, filters,
    allEvents, filteredEvents, stats, eventsByCountry, timelineData,
    loadAllData, selectEvent, selectCountry, setActiveView, updateFilters
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function severityFromFatalities(n) {
  if (n >= 100) return 'critical'
  if (n >= 20)  return 'high'
  if (n >= 5)   return 'medium'
  return 'low'
}

function colorByType(type) {
  const map = {
    'Battles':              [239, 68,  68],
    'Violence against civilians': [245, 158, 11],
    'Explosions/Remote violence': [234, 179, 8],
    'Protests':             [59,  130, 246],
    'Riots':                [168, 85,  247],
    'Strategic developments': [16, 185, 129],
  }
  return map[type] || [100, 116, 139]
}
