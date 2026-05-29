import axios from "axios";

// GDELT 2.0 DOC API — fully open, no key required
// Proxied through /proxy/gdelt to avoid CORS (10-min server-side cache)
export async function fetchGDELTEvents() {
  try {
    const res = await axios.get("/proxy/gdelt", { timeout: 15000 });
    const articles = res.data?.articles || [];
    return articles.map(a => ({
      id: a.url,
      title: a.title,
      url: a.url,
      source: a.domain,
      date: a.seendate,
      country: a.sourcecountry || "Unknown",
      language: a.language,
      tone: parseFloat(a.tone) || 0,
      relevance: parseFloat(a.relevance) || 0
    }));
  } catch (err) {
    console.warn("GDELT fetch failed:", err.message);
    return getMockGDELTData();
  }
}

function getMockGDELTData() {
  return [
    { id:"g1", title:"Heavy fighting reported near Avdiivka front line", url:"#", source:"reuters.com", date:"20240315", country:"Ukraine", tone:-4.2, relevance:0.95 },
    { id:"g2", title:"Sudan conflict: Thousands flee Khartoum amid RSF advance", url:"#", source:"bbc.com", date:"20240314", country:"Sudan", tone:-5.8, relevance:0.92 },
    { id:"g3", title:"Gaza ceasefire talks stall as fighting intensifies", url:"#", source:"aljazeera.com", date:"20240313", country:"Israel", tone:-6.1, relevance:0.97 },
    { id:"g4", title:"Myanmar junta launches airstrikes on Shan State villages", url:"#", source:"irrawaddy.com", date:"20240312", country:"Myanmar", tone:-5.3, relevance:0.88 },
    { id:"g5", title:"Al-Shabaab attacks military base in southern Somalia", url:"#", source:"voanews.com", date:"20240311", country:"Somalia", tone:-4.9, relevance:0.85 },
    { id:"g6", title:"Houthi missile targets Red Sea shipping lane", url:"#", source:"apnews.com", date:"20240310", country:"Yemen", tone:-4.5, relevance:0.90 },
    { id:"g7", title:"DRC: M23 rebels seize key town in North Kivu", url:"#", source:"rfi.fr", date:"20240309", country:"DRC", tone:-5.1, relevance:0.87 },
    { id:"g8", title:"Ethiopia: Amhara conflict displaces 200,000 civilians", url:"#", source:"unhcr.org", date:"20240308", country:"Ethiopia", tone:-5.6, relevance:0.89 },
    { id:"g9", title:"Pakistan army operation kills 12 TTP militants in KPK", url:"#", source:"dawn.com", date:"20240307", country:"Pakistan", tone:-3.8, relevance:0.82 },
    { id:"g10", title:"Mali: JNIM ambush kills 8 soldiers near Mopti", url:"#", source:"lemonde.fr", date:"20240306", country:"Mali", tone:-4.7, relevance:0.84 },
  ];
}
