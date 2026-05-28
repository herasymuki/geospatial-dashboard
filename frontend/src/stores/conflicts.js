import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchACLEDEvents, fetchUCDPEvents, fetchGDELTEvents, fetchReliefWebCrises } from '@/services/dataService'
import dayjs from 'dayjs'

// ── Helpers ───────────────────────────────────────────────────────────────────
function severityFromFatalities(n) {
  if (n >= 100) return 'critical'
  if (n >= 20)  return 'high'
  if (n >= 5)   return 'medium'
  return 'low'
}

function colorByType(type) {
  const map = {
    'Battles':                       [239, 68,  68],
    'Violence against civilians':    [245, 158, 11],
    'Explosions/Remote violence':    [234, 179, 8],
    'Protests':                      [59,  130, 246],
    'Riots':                         [168, 85,  247],
    'Strategic developments':        [16,  185, 129],
    'Armed Conflict':                [245, 158, 11],
  }
  return map[type] || [100, 116, 139]
}

export const useConflictsStore = defineStore('conflicts', () => {
  // ── Raw data ─────────────────────────────────────────────────────────────
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
  const lastUpdated     = ref(null)

  // ── Filters ───────────────────────────────────────────────────────────────
  const filters = ref({
    dateFrom:      '2023-01-01',
    dateTo:        new Date().toISOString().slice(0, 10),
    eventTypes:    [],
    minFatalities: 0,
    sources:       { acled: true, ucdp: true, gdelt: true, reliefweb: false },
    countries:     [],
    severity:      []
  })

  // ── Merged / normalised events ────────────────────────────────────────────
  const allEvents = computed(() => {
    const events = []

    acledEvents.value.forEach(e => {
      const lat = parseFloat(e.latitude)
      const lng = parseFloat(e.longitude)
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return
      const fat = parseInt(e.fatalities) || 0
      events.push({
        id:         `acled-${e.data_id}`,
        source:     'ACLED',
        lat, lng,
        country:    e.country || 'Unknown',
        date:       e.event_date,
        type:       e.event_type || 'Unknown',
        subtype:    e.sub_event_type || '',
        fatalities: fat,
        actor1:     e.actor1 || '',
        actor2:     e.actor2 || '',
        notes:      e.notes || '',
        severity:   severityFromFatalities(fat),
        color:      colorByType(e.event_type),
        position:   [lng, lat]
      })
    })

    ucdpConflicts.value.forEach(c => {
      const lat = parseFloat(c.latitude)
      const lng = parseFloat(c.longitude)
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return
      const fat = parseInt(c.best) || 0
      events.push({
        id:         `ucdp-${c.id}`,
        source:     'UCDP',
        lat, lng,
        country:    c.country || 'Unknown',
        date:       c.date_start,
        type:       c.type_of_violence_label || 'Armed Conflict',
        subtype:    c.dyad_name || '',
        fatalities: fat,
        actor1:     c.side_a || '',
        actor2:     c.side_b || '',
        notes:      c.source_article || '',
        severity:   severityFromFatalities(fat),
        color:      [245, 158, 11],
        position:   [lng, lat]
      })
    })

    gdeltEvents.value.forEach(e => {
      const lat = parseFloat(e.ActionGeo_Lat)
      const lng = parseFloat(e.ActionGeo_Long)
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return
      const dateStr = e.SQLDATE?.toString().replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3') || ''
      events.push({
        id:         `gdelt-${e.GLOBALEVENTID}`,
        source:     'GDELT',
        lat, lng,
        country:    e.ActionGeo_CountryCode || 'Unknown',
        date:       dateStr,
        type:       e.EventCode ? `CAMEO:${e.EventCode}` : 'Event',
        subtype:    e.EventBaseCode || '',
        fatalities: 0,
        actor1:     e.Actor1Name || '',
        actor2:     e.Actor2Name || '',
        notes:      e.SOURCEURL || '',
        severity:   'low',
        color:      [6, 182, 212],
        position:   [lng, lat]
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
      if (filters.value.severity.length && !filters.value.severity.includes(e.severity)) return false
      if (e.date && e.date < filters.value.dateFrom) return false
      if (e.date && e.date > filters.value.dateTo) return false
      return true
    })
  })

  const stats = computed(() => {
    const evts = filteredEvents.value
    const countries = new Set(evts.map(e => e.country)).size
    const totalFatalities = evts.reduce((s, e) => s + e.fatalities, 0)
    const highSeverity = evts.filter(e => e.severity === 'critical' || e.severity === 'high').length
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 }
    evts.forEach(e => { if (bySeverity[e.severity] !== undefined) bySeverity[e.severity]++ })
    return {
      totalEvents:     evts.length,
      totalFatalities,
      countries,
      highSeverity,
      bySeverity
    }
  })

  const eventsByCountry = computed(() => {
    const map = {}
    filteredEvents.value.forEach(e => {
      if (!map[e.country]) map[e.country] = { count: 0, fatalities: 0, events: [] }
      map[e.country].count++
      map[e.country].fatalities += e.fatalities
      if (map[e.country].events.length < 5) map[e.country].events.push(e)
    })
    return map
  })

  const topCountries = computed(() => {
    return Object.entries(eventsByCountry.value)
      .map(([country, d]) => ({ country, ...d }))
      .sort((a, b) => b.fatalities - a.fatalities)
      .slice(0, 10)
  })

  const timelineData = computed(() => {
    const byMonth = {}
    filteredEvents.value.forEach(e => {
      if (!e.date || e.date.length < 7) return
      const month = e.date.slice(0, 7)
      if (!byMonth[month]) byMonth[month] = { date: month, count: 0, fatalities: 0 }
      byMonth[month].count++
      byMonth[month].fatalities += e.fatalities
    })
    return Object.values(byMonth).sort((a, b) => a.date.localeCompare(b.date))
  })

  const arcData = computed(() => {
    const high = filteredEvents.value.filter(e => e.severity === 'critical' || e.severity === 'high')
    const arcs = []
    for (let i = 0; i < Math.min(high.length - 1, 80); i++) {
      const a = high[i], b = high[i + 1]
      if (Math.abs(a.lat - b.lat) > 0.5 || Math.abs(a.lng - b.lng) > 0.5) {
        arcs.push({
          startLat: a.lat, startLng: a.lng,
          endLat:   b.lat, endLng:   b.lng,
          color:    ['rgba(239,68,68,0.6)', 'rgba(245,158,11,0.6)'],
          value:    a.fatalities + b.fatalities
        })
      }
    }
    return arcs
  })

  // ── Actions ───────────────────────────────────────────────────────────────
  async function loadAllData() {
    loading.value = true
    error.value   = null
    try {
      const f = filters.value
      const [acled, ucdp, gdelt, rw] = await Promise.allSettled([
        fetchACLEDEvents(f),
        fetchUCDPEvents(f),
        fetchGDELTEvents(f),
        fetchReliefWebCrises(f),
      ])
      if (acled.status === 'fulfilled')  acledEvents.value     = acled.value
      if (ucdp.status === 'fulfilled')   ucdpConflicts.value   = ucdp.value
      if (gdelt.status === 'fulfilled')  gdeltEvents.value     = gdelt.value
      if (rw.status === 'fulfilled')     reliefWebCrises.value = rw.value
      lastUpdated.value = new Date().toISOString()
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  function selectEvent(evt) {
    selectedEvent.value   = evt
    selectedCountry.value = evt?.country || null
  }

  function setActiveView(v) {
    activeView.value = v
  }

  function clearSelection() {
    selectedEvent.value   = null
    selectedCountry.value = null
  }

  return {
    acledEvents, ucdpConflicts, gdeltEvents, reliefWebCrises,
    loading, error, selectedEvent, selectedCountry, activeView, lastUpdated,
    filters, allEvents, filteredEvents, stats, eventsByCountry,
    topCountries, timelineData, arcData,
    loadAllData, selectEvent, setActiveView, clearSelection
  }
})
