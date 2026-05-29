const express = require('express');
const path    = require('path');
const https   = require('https');
const http    = require('http');
const zlib    = require('zlib');

const app  = express();
const PORT = process.env.PORT || 8080;

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
    req.setTimeout(25000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// POST fetch helper
function postUrl(url, body, opts = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const parsed  = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port:     parsed.port || (url.startsWith('https') ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method:   'POST',
      headers: {
        'User-Agent':    'global-conflicts-athena/1.0',
        'Content-Type':  opts.contentType || 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...(opts.headers || {})
      }
    };
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(25000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(bodyStr);
    req.end();
  });
}

// ── CORS helper ───────────────────────────────────────────────────────────────
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
}

// ════════════════════════════════════════════════════════════════════════════
// ROUTE 1: GDELT — real-time conflict news events (10-min cache)
// ════════════════════════════════════════════════════════════════════════════
app.get('/proxy/gdelt', async (req, res) => {
  cors(res);
  const cached = getCache('gdelt');
  if (cached) return res.json(cached);
  try {
    const qs = new URLSearchParams({
      query: 'war conflict military attack explosion airstrike casualties',
      mode: 'artlist', maxrecords: '75', format: 'json', timespan: '7d', sort: 'DateDesc'
    });
    const r = await fetchUrl(`https://api.gdeltproject.org/api/v2/doc/doc?${qs}`);
    const data = JSON.parse(r.body);
    setCache('gdelt', data, 10 * 60 * 1000);
    res.json(data);
  } catch (e) {
    console.error('GDELT error:', e.message);
    res.status(502).json({ error: e.message, articles: [] });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTE 2: UCDP — tries REST API v24.1, v23.1, then v22.1 (6-hour cache)
// ════════════════════════════════════════════════════════════════════════════
app.get('/proxy/ucdp', async (req, res) => {
  cors(res);
  const cached = getCache('ucdp');
  if (cached) return res.json(cached);
  const versions = ['24.1', '23.1', '22.1'];
  for (const ver of versions) {
    try {
      const url = `https://ucdpapi.pcr.uu.se/api/gedevents/${ver}?pagesize=1000&page=1`;
      const r = await fetchUrl(url);
      if (r.status === 200) {
        const data = JSON.parse(r.body);
        if (data.Result && data.Result.length > 0) {
          const result = { Result: data.Result, TotalCount: data.TotalCount || data.Result.length, source: `ucdp-api-v${ver}` };
          setCache('ucdp', result, 6 * 60 * 60 * 1000);
          return res.json(result);
        }
      }
    } catch (e) { console.warn(`UCDP v${ver} failed:`, e.message); }
  }
  // Return empty — frontend will use mock data
  res.status(502).json({ error: 'All UCDP API versions failed', Result: [] });
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTE 3: GDACS — UN Global Disaster Alert & Coordination System (15-min cache)
// ════════════════════════════════════════════════════════════════════════════
app.get('/proxy/gdacs', async (req, res) => {
  cors(res);
  const cached = getCache('gdacs');
  if (cached) return res.json(cached);
  try {
    // Try JSON API first
    const apiUrl = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ,TC,FL,VO,WF,DR,TS&alertlevel=Green,Orange,Red&fromDate=2024-01-01&toDate=2099-12-31&pagesize=50';
    let items = [];
    try {
      const r = await fetchUrl(apiUrl);
      if (r.status === 200) {
        const data = JSON.parse(r.body);
        const features = data.features || [];
        items = features.map((f, i) => {
          const p = f.properties || {};
          const coords = f.geometry?.coordinates || [null, null];
          return {
            id: `gdacs-${p.eventid || i}`,
            title: p.htmldescription ? p.htmldescription.replace(/<[^>]*>/g,'').trim() : (p.name || 'GDACS Alert'),
            description: p.description || '',
            date: p.fromdate || p.todate || '',
            url: p.url?.report || p.url?.details || '#',
            lat: coords[1],
            lng: coords[0],
            country: p.country || 'Unknown',
            eventType: p.eventtype || 'Alert',
            alertLevel: p.alertlevel || 'Green',
            severity: p.severity?.value || '',
            source: 'GDACS'
          };
        }).filter(e => e.lat !== null && e.lng !== null);
      }
    } catch(e2) { console.warn('GDACS JSON API failed, trying RSS:', e2.message); }

    // Fallback: RSS XML
    if (items.length === 0) {
      const r = await fetchUrl('https://www.gdacs.org/xml/rss.xml');
      if (r.status === 200) {
        const xml = r.body;
        const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
        itemMatches.forEach((item, idx) => {
          const get = (tag) => {
            const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`));
            return m ? (m[1] || m[2] || '').trim() : '';
          };
          const title     = get('title');
          const latVal    = item.match(/<geo:lat>([^<]*)<\/geo:lat>/)?.[1] || item.match(/<gdacs:latitude>([^<]*)<\/gdacs:latitude>/)?.[1] || '';
          const lngVal    = item.match(/<geo:long>([^<]*)<\/geo:long>/)?.[1] || item.match(/<gdacs:longitude>([^<]*)<\/gdacs:longitude>/)?.[1] || '';
          const alertLevel = item.match(/<gdacs:alertlevel>([^<]*)<\/gdacs:alertlevel>/)?.[1] || 'Green';
          const country   = item.match(/<gdacs:country>([^<]*)<\/gdacs:country>/)?.[1] || '';
          const eventType = item.match(/<gdacs:eventtype>([^<]*)<\/gdacs:eventtype>/)?.[1] || 'Alert';
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
// ROUTE 4: Wikidata SPARQL — ongoing armed conflicts (1-hour cache)
// ════════════════════════════════════════════════════════════════════════════
app.get('/proxy/wikidata', async (req, res) => {
  cors(res);
  const cached = getCache('wikidata');
  if (cached) return res.json(cached);
  try {
    const sparql = `
SELECT DISTINCT ?conflict ?conflictLabel ?startDate ?endDate ?countryLabel ?coord ?casualties WHERE {
  ?conflict wdt:P31/wdt:P279* wd:Q350604 .
  OPTIONAL { ?conflict wdt:P580 ?startDate . }
  OPTIONAL { ?conflict wdt:P582 ?endDate . }
  OPTIONAL { ?conflict wdt:P17 ?country . }
  OPTIONAL { ?conflict wdt:P625 ?coord . }
  OPTIONAL { ?conflict wdt:P1120 ?casualties . }
  FILTER NOT EXISTS { ?conflict wdt:P582 ?end . FILTER(?end < "2010-01-01"^^xsd:dateTime) }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
ORDER BY DESC(?startDate)
LIMIT 150`.trim();

    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
    const r = await fetchUrl(url, { headers: { 'Accept': 'application/sparql-results+json' } });
    if (r.status !== 200) throw new Error(`Wikidata returned ${r.status}: ${r.body.slice(0,200)}`);

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
// ROUTE 5: UNHCR — Refugee & IDP population flows (24-hour cache)
// ════════════════════════════════════════════════════════════════════════════
app.get('/proxy/unhcr', async (req, res) => {
  cors(res);
  const cached = getCache('unhcr');
  if (cached) return res.json(cached);
  try {
    const [refR, idpR] = await Promise.allSettled([
      fetchUrl('https://api.unhcr.org/population/v1/refugees/?limit=100&sortBy=individuals&sortOrder=desc&yearFrom=2022'),
      fetchUrl('https://api.unhcr.org/population/v1/idps/?limit=100&sortBy=individuals&sortOrder=desc&yearFrom=2022')
    ]);

    let refugees = [], idps = [];
    if (refR.status === 'fulfilled' && refR.value.status === 200) {
      const d = JSON.parse(refR.value.body);
      refugees = (d.items || []).map(r => ({
        id: `unhcr-ref-${r.id || Math.random()}`,
        type: 'Refugees',
        originCountry: r.coo_name || 'Unknown',
        originIso: r.coo || '',
        asylumCountry: r.coa_name || 'Unknown',
        asylumIso: r.coa || '',
        individuals: parseInt(r.individuals) || 0,
        year: r.year || 2023,
        source: 'UNHCR'
      }));
    }
    if (idpR.status === 'fulfilled' && idpR.value.status === 200) {
      const d = JSON.parse(idpR.value.body);
      idps = (d.items || []).map(r => ({
        id: `unhcr-idp-${r.id || Math.random()}`,
        type: 'IDPs',
        originCountry: r.coo_name || 'Unknown',
        originIso: r.coo || '',
        asylumCountry: r.coa_name || 'Unknown',
        asylumIso: r.coa || '',
        individuals: parseInt(r.individuals) || 0,
        year: r.year || 2023,
        source: 'UNHCR'
      }));
    }

    const result = {
      refugees, idps,
      totalRefugees: refugees.reduce((s, r) => s + r.individuals, 0),
      totalIDPs: idps.reduce((s, r) => s + r.individuals, 0),
      source: 'unhcr'
    };
    setCache('unhcr', result, 24 * 60 * 60 * 1000);
    res.json(result);
  } catch (e) {
    console.error('UNHCR error:', e.message);
    res.status(502).json({ error: e.message, refugees: [], idps: [] });
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
      const r = await fetchUrl(feed.url);
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
