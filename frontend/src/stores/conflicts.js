import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fetchACLEDEvents, fetchUCDPEvents, fetchGDELTEvents, fetchReliefWebCrises } from '@/services/dataService'
import dayjs from 'dayjs'

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
  const acledEvents     = ref([])
  const ucdpConflicts   = ref([])
  const gdeltEvents     = ref([])
  const reliefWebCrises = ref([])

  const loading         = ref(false)
  const error           = ref(null)
  const selectedEvent   = ref(null)
  const selectedCountry = ref(null)
  const activeView      = ref('globe')
  const lastUpdated     = ref(null)

  const filters = ref({
    dateFrom:      '2023-01-01',
    dateTo:        new Date().toISOString().slice(0, 10),
    eventTypes:    [],
    minFatalities: 0,
    sources:       { acled: true, ucdp: true, gdelt: true, reliefweb: false },
    countries:     [],
    severity:      []
  })

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
        type:       'Conflict Event',
        subtype:    `CAMEO ${e.EventCode}`,
        fatalities: 0,
        actor1:     e.Actor1Name || '',
        actor2:     e.Actor2Name || '',
        notes:      e.SOURCEURL || '',
        severity:   'low',
        color:      [99, 102, 241],
        position:   [lng, lat]
      })
    })

    return events
  })

  const filteredEvents = computed(() => {
    let evts = allEvents.value

    // Source filter
    evts = evts.filter(e => {
      const src = e.source.toLowerCase()
      return filters.value.sources[src] !== false
    })

    // Date filter
    if (filters.value.dateFrom) {
      evts = evts.filter(e => !e.date || e.date >= filters.value.dateFrom)
    }
    if (filters.value.dateTo) {
      evts = evts.filter(e => !e.date || e.date <= filters.value.dateTo)
    }

    // Min fatalities
    if (filters.value.minFatalities > 0) {
      evts = evts.filter(e => e.fatalities >= filters.value.minFatalities)
    }

    // Event types
    if (filters.value.eventTypes.length > 0) {
      evts = evts.filter(e => filters.value.eventTypes.includes(e.type))
    }

    // Severity
    if (filters.value.severity.length > 0) {
      evts = evts.filter(e => filters.value.severity.includes(e.severity))
    }

    // Countries
    if (filters.value.countries.length > 0) {
      evts = evts.filter(e => filters.value.countries.includes(e.country))
    }

    return evts
  })

  const stats = computed(() => {
    const evts = filteredEvents.value
    const countries = new Set(evts.map(e => e.country)).size
    const totalFatalities = evts.reduce((s, e) => s + e.fatalities, 0)
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 }
    evts.forEach(e => { bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1 })
    const bySource = {}
    evts.forEach(e => { bySource[e.source] = (bySource[e.source] || 0) + 1 })
    return {
      totalEvents: evts.length,
      totalFatalities,
      countries,
      bySeverity,
      bySource,
    }
  })

  const timelineData = computed(() => {
    const evts = filteredEvents.value
    const byMonth = {}
    evts.forEach(e => {
      if (!e.date) return
      const month = e.date.slice(0, 7)
      if (!byMonth[month]) byMonth[month] = { date: month, count: 0, fatalities: 0 }
      byMonth[month].count++
      byMonth[month].fatalities += e.fatalities
    })
    return Object.values(byMonth).sort((a, b) => a.date.localeCompare(b.date))
  })

  const topCountries = computed(() => {
    const evts = filteredEvents.value
    const map = {}
    evts.forEach(e => {
      if (!map[e.country]) map[e.country] = { country: e.country, count: 0, fatalities: 0 }
      map[e.country].count++
      map[e.country].fatalities += e.fatalities
    })
    return Object.values(map).sort((a, b) => b.fatalities - a.fatalities)
  })

  const eventTypes = computed(() => {
    const types = new Set(allEvents.value.map(e => e.type))
    return [...types].sort()
  })

  const countryList = computed(() => {
    const countries = new Set(allEvents.value.map(e => e.country))
    return [...countries].sort()
  })

  async function fetchAllData() {
    loading.value = true
    error.value   = null
    try {
      const [acled, ucdp, gdelt, rw] = await Promise.allSettled([
        fetchACLEDEvents(filters.value),
        fetchUCDPEvents(filters.value),
        fetchGDELTEvents(filters.value),
        fetchReliefWebCrises(filters.value),
      ])
      if (acled.status  === 'fulfilled') acledEvents.value     = acled.value
      if (ucdp.status   === 'fulfilled') ucdpConflicts.value   = ucdp.value
      if (gdelt.status  === 'fulfilled') gdeltEvents.value     = gdelt.value
      if (rw.status     === 'fulfilled') reliefWebCrises.value = rw.value
      lastUpdated.value = new Date().toISOString()
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  function selectEvent(event) {
    selectedEvent.value   = event
    selectedCountry.value = event?.country || null
  }

  function clearSelection() {
    selectedEvent.value   = null
    selectedCountry.value = null
  }

  function setActiveView(view) {
    activeView.value = view
  }

  function updateFilters(newFilters) {
    filters.value = { ...filters.value, ...newFilters }
  }

  return {
    acledEvents, ucdpConflicts, gdeltEvents, reliefWebCrises,
    loading, error, selectedEvent, selectedCountry,
    activeView, lastUpdated, filters,
    allEvents, filteredEvents, stats, timelineData,
    topCountries, eventTypes, countryList,
    fetchAllData, selectEvent, clearSelection,
    setActiveView, updateFilters,
  }
})
