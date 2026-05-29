const express = require('express');
const path    = require('path');
const https   = require('https');
const http    = require('http');

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

// ── Generic fetch helper (Node built-in https/http) ──────────────────────────
function fetchUrl(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const options = { headers: { 'User-Agent': 'global-conflicts-athena/1.0', ...(opts.headers || {}) } };
    const req = lib.get(url, options, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location, opts).then(resolve).catch(reject);
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout')); });
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
      mode: 'artlist',
      maxrecords: '75',
      format: 'json',
      timespan: '7d',
      sort: 'DateDesc'
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
// ROUTE 2: UCDP — GED CSV bulk download, parsed server-side (6-hour cache)
// Returns last 2 years of events from the public annual CSV
// ════════════════════════════════════════════════════════════════════════════
app.get('/proxy/ucdp', async (req, res) => {
  cors(res);
  const cached = getCache('ucdp');
  if (cached) return res.json(cached);
  try {
    // UCDP GED v24.0.1 public CSV — no auth required
    const csvUrl = 'https://ucdp.uu.se/downloads/ged/ged241-csv.zip';
    // Fallback: use the paginated REST API with a known-working version
    const apiUrl = 'https://ucdpapi.pcr.uu.se/api/gedevents/24.1?pagesize=1000&page=1';
    let r;
    try {
      r = await fetchUrl(apiUrl);
      if (r.status === 200) {
        const data = JSON.parse(r.body);
        const result = { Result: data.Result || [], TotalCount: data.TotalCount || 0, source: 'ucdp-api' };
        setCache('ucdp', result, 6 * 60 * 60 * 1000);
        return res.json(result);
      }
    } catch(e2) { console.warn('UCDP API failed, trying GED endpoint:', e2.message); }

    // Fallback: try v23.1
    r = await fetchUrl('https://ucdpapi.pcr.uu.se/api/gedevents/23.1?pagesize=1000&page=1');
    if (r.status === 200) {
      const data = JSON.parse(r.body);
      const result = { Result: data.Result || [], TotalCount: data.TotalCount || 0, source: 'ucdp-api-v23' };
      setCache('ucdp', result, 6 * 60 * 60 * 1000);
      return res.json(result);
    }
    throw new Error(`UCDP API returned ${r.status}`);
  } catch (e) {
    console.error('UCDP error:', e.message);
    res.status(502).json({ error: e.message, Result: [] });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTE 3: GDACS — UN Global Disaster Alert & Coordination System (15-min cache)
// Real-time alerts for conflicts, displacement, complex emergencies
// ════════════════════════════════════════════════════════════════════════════
app.get('/proxy/gdacs', async (req, res) => {
  cors(res);
  const cached = getCache('gdacs');
  if (cached) return res.json(cached);
  try {
    // GDACS public RSS feed — no auth, no registration
    const r = await fetchUrl('https://www.gdacs.org/xml/rss.xml');
    if (r.status !== 200) throw new Error(`GDACS RSS returned ${r.status}`);

    // Parse XML manually (lightweight, no dependency)
    const xml = r.body;
    const items = [];
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

    itemMatches.forEach((item, idx) => {
      const get = (tag) => {
        const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`));
        return m ? (m[1] || m[2] || '').trim() : '';
      };
      const getAttr = (tag, attr) => {
        const m = item.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"[^>]*>`));
        return m ? m[1] : '';
      };

      const title    = get('title');
      const desc     = get('description');
      const pubDate  = get('pubDate');
      const link     = get('link') || getAttr('link', 'href');
      const lat      = getAttr('geo:Point', '') || '';
      const latVal   = item.match(/<geo:lat>([^<]*)<\/geo:lat>/)?.[1] || item.match(/<gdacs:latitude>([^<]*)<\/gdacs:latitude>/)?.[1] || '';
      const lngVal   = item.match(/<geo:long>([^<]*)<\/geo:long>/)?.[1] || item.match(/<gdacs:longitude>([^<]*)<\/gdacs:longitude>/)?.[1] || '';
      const severity = item.match(/<gdacs:severity[^>]*>([^<]*)<\/gdacs:severity>/)?.[1] || '';
      const country  = item.match(/<gdacs:country>([^<]*)<\/gdacs:country>/)?.[1] || '';
      const eventType= item.match(/<gdacs:eventtype>([^<]*)<\/gdacs:eventtype>/)?.[1] || 'Alert';
      const alertLevel = item.match(/<gdacs:alertlevel>([^<]*)<\/gdacs:alertlevel>/)?.[1] || 'Green';

      if (title) {
        items.push({
          id: `gdacs-${idx}`,
          title,
          description: desc.replace(/<[^>]*>/g, '').slice(0, 300),
          date: pubDate,
          link,
          lat: parseFloat(latVal) || null,
          lng: parseFloat(lngVal) || null,
          severity,
          country,
          eventType,
          alertLevel,
          source: 'GDACS'
        });
      }
    });

    const result = { items, count: items.length, source: 'gdacs' };
    setCache('gdacs', result, 15 * 60 * 1000);
    res.json(result);
  } catch (e) {
    console.error('GDACS error:', e.message);
    res.status(502).json({ error: e.message, items: [] });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTE 4: Wikidata SPARQL — ongoing armed conflicts with coordinates (1-hour cache)
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
  FILTER NOT EXISTS { ?conflict wdt:P582 ?end . FILTER(?end < "2015-01-01"^^xsd:dateTime) }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
ORDER BY DESC(?startDate)
LIMIT 150
`.trim();

    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
    const r = await fetchUrl(url, { headers: { 'Accept': 'application/sparql-results+json' } });
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
        lat,
        lng,
        casualties: parseInt(b.casualties?.value) || 0,
        source: 'Wikidata',
        status: b.endDate ? 'resolved' : 'ongoing'
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
// Used for globe arc layer showing displacement flows
// ════════════════════════════════════════════════════════════════════════════
app.get('/proxy/unhcr', async (req, res) => {
  cors(res);
  const cached = getCache('unhcr');
  if (cached) return res.json(cached);
  try {
    // UNHCR Population API v1 — fully open, no key
    const [refR, idpR] = await Promise.all([
      fetchUrl('https://api.unhcr.org/population/v1/refugees/?limit=100&sortBy=individuals&sortOrder=desc&yearFrom=2022'),
      fetchUrl('https://api.unhcr.org/population/v1/idps/?limit=100&sortBy=individuals&sortOrder=desc&yearFrom=2022')
    ]);

    let refugees = [], idps = [];
    if (refR.status === 200) {
      const d = JSON.parse(refR.body);
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
    if (idpR.status === 200) {
      const d = JSON.parse(idpR.body);
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

    const result = { refugees, idps, totalRefugees: refugees.reduce((s,r) => s + r.individuals, 0),
      totalIDPs: idps.reduce((s,r) => s + r.individuals, 0), source: 'unhcr' };
    setCache('unhcr', result, 24 * 60 * 60 * 1000);
    res.json(result);
  } catch (e) {
    console.error('UNHCR error:', e.message);
    res.status(502).json({ error: e.message, refugees: [], idps: [] });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// ROUTE 6: RSS — direct server-side XML fetch + parse (15-min cache)
// BBC World, Al Jazeera, AP News via RSSHub — no third-party service
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
    const guid  = getTag('guid') || link;
    if (title) items.push({ id: `rss-${feedName}-${i}`, title, description: desc, url: link, date, source: feedName, guid });
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
    } catch (e) {
      console.warn(`RSS ${feed.name} failed:`, e.message);
    }
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
