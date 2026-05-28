import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 30000 })

export async function fetchACLEDEvents(filters = {}) {
  const { data } = await api.get('/data/acled', {
    params: {
      date_from: filters.dateFrom,
      date_to:   filters.dateTo,
      countries: filters.countries?.join(',') || '',
      limit:     2000
    }
  })
  return data.events || []
}

export async function fetchUCDPConflicts(filters = {}) {
  const { data } = await api.get('/data/ucdp', {
    params: {
      date_from: filters.dateFrom,
      date_to:   filters.dateTo,
      limit:     1000
    }
  })
  return data.events || []
}

export async function fetchGDELTEvents(filters = {}) {
  const { data } = await api.get('/data/gdelt', {
    params: {
      date_from: filters.dateFrom,
      date_to:   filters.dateTo,
      limit:     500
    }
  })
  return data.events || []
}

export async function fetchReliefWebCrises(filters = {}) {
  const { data } = await api.get('/data/reliefweb', { params: { limit: 200 } })
  return data.crises || []
}

export async function fetchCountryGeoJSON() {
  const { data } = await api.get('/data/geojson/countries')
  return data
}
