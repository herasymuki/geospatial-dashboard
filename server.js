const express = require('express');
const path    = require('path');
const https   = require('https');
const http    = require('http');
const zlib    = require('zlib');

const app  = express();
const PORT = process.env.PORT || 8080;

app.set('etag', false); // Disable ETags globally — prevents browser caching stale proxy responses
app.use(express.json());

// ── In-memory cache ──────────────────────────────────────────────────────────
const cache = {};
function getCache(key) {
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > entry.ttl) { delete cache[key]; return null; }
  return entry.data;
}
function setCache(key, data, ttlMs) {
  cache[key] = { data, ts: Date.now(), ttl: ttlMs };
}

// ── Generic fetch helper ──────────────────────────────────────────────────────
function fetchUrl(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const options = {
      headers: {
        'User-Agent': 'global-conflicts-athena/1.0',
        'Accept': 'application/json, text/plain, */*',
        ...(opts.headers || {})
      }
    };
    const req = lib.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, opts).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const enc = res.headers['content-encoding'];
        const decompress = enc === 'gzip'    ? zlib.gunzip
                         : enc === 'deflate' ? zlib.inflate
                         : enc === 'br'      ? zlib.brotliDecompress
                         : null;
        if (decompress) {
          decompress(buf, (err, decoded) => {
            if (err) return reject(err);
            resolve({ status: res.statusCode, body: decoded.toString('utf8'), headers: res.headers });
          });
        } else {
          resolve({ status: res.statusCode, body: buf.toString('utf8'), headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(opts.timeout || 20000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ── CORS helper ───────────────────────────────────────────────────────────────
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
}

// ════════════════════════════════════════════════════════════════════════════
// ROUTE 1: GDELT — real-time conflict news events (30-min cache)
// Rate limited to 1 req/5s — use longer cache to avoid 429
// ════════════════════════════════════════════════════════════════════════════
app.get('/proxy/gdelt', async (req, res) => {
  cors(res);
  const cached = getCache('gdelt');
  if (cached) return res.json(cached);
  try {
    const qs = new URLSearchParams({
      query: 'war conflict military attack explosion airstrike',
      mode: 'artlist', maxrecords: '50', format: 'json', timespan: '3d', sort: 'DateDesc'
    });
    const r = await fetchUrl(`https://api.gdeltproject.org/api/v2/doc/doc?${qs}`, { timeout: 30000 });
    if (r.status === 429) {
      // Return empty — frontend uses mock data
      return res.status(429).json({ error: 'GDELT rate limited', articles: [] });
    }
    const data = JSON.parse(r.body);
    setCache('gdelt', data, 30 * 60 * 1000); // 30-min cache to avoid rate limits
    res.json(data);
  } catch (e) {
    console.error('GDELT error:', e.message);
    res.status(502).json({ error: e.message, articles: [] });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTE 2: UCDP — GED CSV bulk download (6-hour server-side cache only)
// REST API requires auth — use public annual CSV release instead
// NEVER browser-cached: Cache-Control: no-store on every response
// ════════════════════════════════════════════════════════════════════════════
app.get('/proxy/ucdp', async (req, res) => {
  // Disable all browser/proxy caching — responses vary and must never be
  // revalidated from a stale empty fallback
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma':        'no-cache',
    'Expires':       '0',
    'Surrogate-Control': 'no-store'
  });
  res.removeHeader('ETag');
  cors(res);

  // Server-side cache only (6 hours) — never sent to browser
  const cached = getCache('ucdp');
  if (cached) {
    console.log('[UCDP proxy] serving from server-side cache, count:', cached.Result?.length, 'total:', cached.TotalCount);
    return res.json(cached);
  }

  // ── Attempt 1: UCDP GED v24.1 public CSV bulk download ───────────────────
  // This endpoint does NOT require authentication
  const CSV_URL = 'https://ucdp.uu.se/downloads/ged/ged241-csv.zip';
  try {
    console.log('[UCDP proxy] fetching CSV bulk download from', CSV_URL);
    const r = await fetchUrl(CSV_URL, { timeout: 30000 });
    if (r.status === 200) {
      // Parse CSV — extract recent events (last 3 years) with coordinates
      const lines = r.body.split('\n');
      const headers = lines[0].split(',').map(h => h.replace(/"/g,'').trim());
      const idxOf = (name) => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));

      const iId       = idxOf('id');
      const iYear     = idxOf('year');
      const iCountry  = idxOf('country');
      const iLat      = idxOf('latitude');
      const iLng      = idxOf('longitude');
      const iDeaths   = idxOf('deaths_b');
      const iType     = idxOf('type_of_violence');
      const iConflict = idxOf('conflict_name');
      const iDate     = idxOf('date_start');

      const currentYear = new Date().getFullYear();
      const events = [];

      for (let i = 1; i < lines.length && events.length < 500; i++) {
        const row = lines[i].split(',');
        if (row.length < 5) continue;
        const year = parseInt(row[iYear]);
        if (isNaN(year) || year < currentYear - 3) continue;
        const lat = parseFloat(row[iLat]);
        const lng = parseFloat(row[iLng]);
        if (isNaN(lat) || isNaN(lng)) continue;
        events.push({
          id:           row[iId]?.replace(/"/g,'') || String(i),
          year,
          country:      row[iCountry]?.replace(/"/g,'') || 'Unknown',
          latitude:     lat,
          longitude:    lng,
          deaths:       parseInt(row[iDeaths]) || 0,
          typeOfViolence: parseInt(row[iType]) || 1,
          conflictName: row[iConflict]?.replace(/"/g,'') || 'Unknown',
          dateStart:    row[iDate]?.replace(/"/g,'') || '',
          source:       'UCDP-GED'
        });
      }

      if (events.length > 0) {
        const result = { Result: events, TotalCount: events.length, source: 'ucdp-ged-csv' };
        setCache('ucdp', result, 6 * 60 * 60 * 1000);
        console.log('[UCDP proxy] using source: ucdp-ged-csv');
        console.log('[UCDP proxy] result count:', events.length);
        console.log('[UCDP proxy] total count:', events.length);
        return res.json(result);
      }
    }
  } catch (e) {
    console.warn('[UCDP proxy] CSV download failed:', e.message);
  }

  // ── Attempt 2: UCDP Candidate Events API (most recent, sometimes open) ────
  try {
    console.log('[UCDP proxy] trying UCDP candidate events API');
    const r = await fetchUrl(
      'https://ucdpapi.pcr.uu.se/api/gedevents/24.1?pagesize=300&page=1',
      { timeout: 15000 }
    );
    if (r.status === 200) {
      const data = JSON.parse(r.body);
      const result = { Result: data.Result || [], TotalCount: data.TotalCount || 0, source: 'ucdp-api' };
      setCache('ucdp', result, 6 * 60 * 60 * 1000);
      console.log('[UCDP proxy] using source: ucdp-api');
      console.log('[UCDP proxy] result count:', result.Result.length);
      console.log('[UCDP proxy] total count:', result.TotalCount);
      return res.json(result);
    }
  } catch (e) {
    console.warn('[UCDP proxy] API attempt failed:', e.message);
  }

  // ── Fallback: clearly marked, non-empty curated dataset ──────────────────
  console.log('[UCDP proxy] using source: curated-fallback');
  const fallback = {
    Result: [
      { id:'f1', year:2024, country:'Ukraine',          latitude:49.0,  longitude:32.0,  deaths:120, typeOfViolence:1, conflictName:'Russo-Ukrainian War',          dateStart:'2024-01-15', source:'UCDP-curated' },
      { id:'f2', year:2024, country:'Sudan',            latitude:15.5,  longitude:32.5,  deaths:85,  typeOfViolence:1, conflictName:'Sudan Civil War',              dateStart:'2024-02-03', source:'UCDP-curated' },
      { id:'f3', year:2024, country:'Gaza',             latitude:31.5,  longitude:34.4,  deaths:200, typeOfViolence:1, conflictName:'Gaza Conflict',                dateStart:'2024-01-10', source:'UCDP-curated' },
      { id:'f4', year:2024, country:'Myanmar',          latitude:21.9,  longitude:95.9,  deaths:45,  typeOfViolence:1, conflictName:'Myanmar Civil War',            dateStart:'2024-03-01', source:'UCDP-curated' },
      { id:'f5', year:2024, country:'Ethiopia',         latitude:9.1,   longitude:40.4,  deaths:60,  typeOfViolence:1, conflictName:'Amhara Conflict',              dateStart:'2024-01-20', source:'UCDP-curated' },
      { id:'f6', year:2024, country:'Somalia',          latitude:5.1,   longitude:46.2,  deaths:30,  typeOfViolence:2, conflictName:'Al-Shabaab Insurgency',        dateStart:'2024-02-14', source:'UCDP-curated' },
      { id:'f7', year:2024, country:'Mali',             latitude:17.6,  longitude:-3.9,  deaths:25,  typeOfViolence:2, conflictName:'Sahel Insurgency',             dateStart:'2024-01-28', source:'UCDP-curated' },
      { id:'f8', year:2024, country:'DR Congo',         latitude:-4.0,  longitude:21.7,  deaths:70,  typeOfViolence:1, conflictName:'DRC Eastern Conflict',         dateStart:'2024-03-05', source:'UCDP-curated' },
      { id:'f9', year:2024, country:'Haiti',            latitude:18.9,  longitude:-72.3, deaths:15,  typeOfViolence:3, conflictName:'Haiti Gang Violence',          dateStart:'2024-02-20', source:'UCDP-curated' },
      { id:'f10',year:2024, country:'Yemen',            latitude:15.5,  longitude:48.5,  deaths:40,  typeOfViolence:1, conflictName:'Yemen Civil War',              dateStart:'2024-01-05', source:'UCDP-curated' }
    ],
    TotalCount: 10,
    source: 'curated-fallback',
    note: 'UCDP CSV unavailable and API requires auth. Showing curated conflict dataset.'
  };
  console.log('[UCDP proxy] result count:', fallback.Result.length);
  console.log('[UCDP proxy] total count:', fallback.TotalCount);
  // Do NOT cache the fallback — retry on next request
  return res.json(fallback);
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTE 3: GDACS — UN Global Disaster Alert & Coordination System (15-min cache)
// ════════════════════════════════════════════════════════════════════════════
app.get('/proxy/gdacs', async (req, res) => {
  cors(res);
  const cached = getCache('gdacs');
  if (cached) return res.json(cached);
  try {
    let items = [];

    // Try GDACS JSON API first
    try {
      const apiUrl = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ,TC,FL,VO,WF,DR,TS&alertlevel=Green,Orange,Red&fromDate=2024-01-01&toDate=2099-12-31&pagesize=50';
      const r = await fetchUrl(apiUrl, { timeout: 15000 });
      if (r.status === 200) {
        const data = JSON.parse(r.body);
        const features = data.features || [];
        items = features.map((f, i) => {
          const p = f.properties || {};
          const coords = f.geometry?.coordinates || [null, null];
          return {
            id: `gdacs-${p.eventid || i}`,
            title: p.htmldescription ? p.htmldescription.replace(/<[^>]*>/g,'').trim().slice(0,120) : (p.name || 'GDACS Alert'),
            description: p.description || '',
            date: p.fromdate || '',
            url: p.url?.report || p.url?.details || '#',
            lat: coords[1], lng: coords[0],
            country: p.country || 'Unknown',
            eventType: p.eventtype || 'Alert',
            alertLevel: p.alertlevel || 'Green',
            severity: p.severity?.value || '',
            source: 'GDACS'
          };
        }).filter(e => e.lat !== null && e.lng !== null && !isNaN(e.lat) && !isNaN(e.lng));
      }
    } catch(e2) { console.warn('GDACS JSON API failed, trying RSS:', e2.message); }

    // Fallback: RSS XML
    if (items.length === 0) {
      const r = await fetchUrl('https://www.gdacs.org/xml/rss.xml', { timeout: 15000 });
      if (r.status === 200) {
        const xml = r.body;
        const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
        itemMatches.forEach((item, idx) => {
          const get = (tag) => {
            const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`));
            return m ? (m[1] || m[2] || '').trim() : '';
          };
          const title      = get('title');
          const latVal     = item.match(/<geo:lat>([^<]*)<\/geo:lat>/)?.[1] || item.match(/<gdacs:latitude>([^<]*)<\/gdacs:latitude>/)?.[1] || '';
          const lngVal     = item.match(/<geo:long>([^<]*)<\/geo:long>/)?.[1] || item.match(/<gdacs:longitude>([^<]*)<\/gdacs:longitude>/)?.[1] || '';
          const alertLevel = item.match(/<gdacs:alertlevel>([^<]*)<\/gdacs:alertlevel>/)?.[1] || 'Green';
          const country    = item.match(/<gdacs:country>([^<]*)<\/gdacs:country>/)?.[1] || '';
          const eventType  = item.match(/<gdacs:eventtype>([^<]*)<\/gdacs:eventtype>/)?.[1] || 'Alert';
          const lat = parseFloat(latVal);
          const lng = parseFloat(lngVal);
          if (title && !isNaN(lat) && !isNaN(lng)) {
            items.push({
              id: `gdacs-rss-${idx}`, title,
              description: get('description').replace(/<[^>]*>/g,'').slice(0,300),
              date: get('pubDate'), url: get('link') || '#',
              lat, lng, country, eventType, alertLevel,
              severity: alertLevel, source: 'GDACS'
            });
          }
        });
      }
    }

    const result = { items, count: items.length, source: 'gdacs' };
    if (items.length > 0) setCache('gdacs', result, 15 * 60 * 1000);
    res.json(result);
  } catch (e) {
    console.error('GDACS error:', e.message);
    res.status(502).json({ error: e.message, items: [] });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTE 4: Wikidata SPARQL — simplified fast query (1-hour cache)
// Uses direct P31=Q350604 (armed conflict) without deep P279* traversal
// ════════════════════════════════════════════════════════════════════════════
app.get('/proxy/wikidata', async (req, res) => {
  cors(res);
  const cached = getCache('wikidata');
  if (cached) return res.json(cached);
  try {
    // Simplified query — no P279* traversal (that caused timeouts)
    // Direct instance-of armed conflict only, with optional fields
    const sparql = `
SELECT DISTINCT ?conflict ?conflictLabel ?startDate ?endDate ?countryLabel ?coord ?casualties WHERE {
  ?conflict wdt:P31 wd:Q350604 .
  OPTIONAL { ?conflict wdt:P580 ?startDate . }
  OPTIONAL { ?conflict wdt:P582 ?endDate . }
  OPTIONAL { ?conflict wdt:P17 ?country . }
  OPTIONAL { ?conflict wdt:P625 ?coord . }
  OPTIONAL { ?conflict wdt:P1120 ?casualties . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
ORDER BY DESC(?startDate)
LIMIT 100`.trim();

    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
    const r = await fetchUrl(url, {
      headers: { 'Accept': 'application/sparql-results+json' },
      timeout: 20000
    });
    if (r.status !== 200) throw new Error(`Wikidata returned ${r.status}`);

    const data = JSON.parse(r.body);
    const bindings = data.results?.bindings || [];
    const conflicts = bindings.map((b, i) => {
      let lat = null, lng = null;
      if (b.coord?.value) {
        const m = b.coord.value.match(/Point\(([^ ]+) ([^ )]+)\)/);
        if (m) { lng = parseFloat(m[1]); lat = parseFloat(m[2]); }
      }
      return {
        id: `wd-${i}`,
        name: b.conflictLabel?.value || 'Unknown Conflict',
        wikiUrl: b.conflict?.value || '',
        startDate: b.startDate?.value?.slice(0, 10) || '',
        endDate: b.endDate?.value?.slice(0, 10) || '',
        country: b.countryLabel?.value || 'Unknown',
        lat, lng,
        casualties: parseInt(b.casualties?.value) || 0,
        source: 'Wikidata',
        status: b.endDate?.value ? 'resolved' : 'ongoing'
      };
    });

    const result = { conflicts, count: conflicts.length, source: 'wikidata' };
    setCache('wikidata', result, 60 * 60 * 1000);
    res.json(result);
  } catch (e) {
    console.error('Wikidata error:', e.message);
    res.status(502).json({ error: e.message, conflicts: [] });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTE 5: UNHCR — Country-level population data (24-hour cache)
// Correct endpoint: /population/v1/population/ with coo_all=true
// ════════════════════════════════════════════════════════════════════════════
app.get('/proxy/unhcr', async (req, res) => {
  cors(res);
  const cached = getCache('unhcr');
  if (cached) return res.json(cached);
  try {
    // Correct UNHCR API endpoint — country of origin breakdown for 2023
    const r = await fetchUrl(
      'https://api.unhcr.org/population/v1/population/?limit=100&year=2023&coo_all=true',
      { timeout: 20000 }
    );
    if (r.status !== 200) throw new Error(`UNHCR returned ${r.status}`);

    const data = JSON.parse(r.body);
    const items = data.items || [];

    // Build refugee flow records from country-of-origin data
    const refugees = items
      .filter(r => parseInt(r.refugees) > 10000)
      .map((r, i) => ({
        id: `unhcr-ref-${i}`,
        type: 'Refugees',
        originCountry: r.coo_name || 'Unknown',
        originIso: r.coo_iso || r.coo || '',
        asylumCountry: 'Various',
        asylumIso: '',
        individuals: parseInt(r.refugees) || 0,
        idps: parseInt(r.idps) || 0,
        year: r.year || 2023,
        source: 'UNHCR'
      }))
      .sort((a, b) => b.individuals - a.individuals)
      .slice(0, 50);

    // Global totals from the aggregate row (coo = "-")
    const totalsRow = items.find(r => r.coo === '-') || {};
    const totalRefugees = parseInt(totalsRow.refugees) || refugees.reduce((s,r) => s + r.individuals, 0);
    const totalIDPs     = parseInt(totalsRow.idps)     || refugees.reduce((s,r) => s + r.idps, 0);

    const result = { refugees, idps: [], totalRefugees, totalIDPs, source: 'unhcr' };
    setCache('unhcr', result, 24 * 60 * 60 * 1000);
    res.json(result);
  } catch (e) {
    console.error('UNHCR error:', e.message);
    res.status(502).json({ error: e.message, refugees: [], idps: [], totalRefugees: 0, totalIDPs: 0 });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTE 6: RSS — BBC World, Al Jazeera, AP News (15-min cache)
// ════════════════════════════════════════════════════════════════════════════
const RSS_FEEDS = [
  { name: 'BBC World',   url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { name: 'AP News',    url: 'https://rsshub.app/apnews/topics/war-and-conflicts' },
];

const CONFLICT_KW = ['war','conflict','attack','military','bomb','missile','troops','ceasefire',
  'offensive','insurgent','rebel','airstrike','casualties','killed','fighting','battle',
  'siege','invasion','strike','explosion','hostage','terror','coup','sanction','refugee'];

function parseRSSXml(xml, feedName) {
  const items = [];
  const itemBlocks = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
  itemBlocks.forEach((block, i) => {
    const getTag = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`));
      return m ? (m[1] || m[2] || '').trim() : '';
    };
    const title = getTag('title');
    const desc  = getTag('description').replace(/<[^>]*>/g, '').slice(0, 250);
    const link  = getTag('link') || block.match(/<link>([^<]*)<\/link>/)?.[1] || '';
    const date  = getTag('pubDate');
    if (title) items.push({ id: `rss-${feedName}-${i}`, title, description: desc, url: link, date, source: feedName });
  });
  return items;
}

app.get('/proxy/rss', async (req, res) => {
  cors(res);
  const cached = getCache('rss');
  if (cached) return res.json(cached);
  const results = [];
  await Promise.allSettled(RSS_FEEDS.map(async (feed) => {
    try {
      const r = await fetchUrl(feed.url, { timeout: 15000 });
      if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
      const items = parseRSSXml(r.body, feed.name);
      items.forEach(item => {
        const text = `${item.title} ${item.description}`.toLowerCase();
        if (CONFLICT_KW.some(k => text.includes(k))) results.push(item);
      });
    } catch (e) { console.warn(`RSS ${feed.name} failed:`, e.message); }
  }));
  results.sort((a, b) => new Date(b.date) - new Date(a.date));
  const result = { items: results, count: results.length };
  if (results.length > 0) setCache('rss', result, 15 * 60 * 1000);
  res.json(result);
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTE 7: Health check
// ════════════════════════════════════════════════════════════════════════════
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString(), cacheKeys: Object.keys(cache) });
});

// ── Serve static Vue build ────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
