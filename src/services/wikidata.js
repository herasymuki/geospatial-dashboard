import axios from "axios";

// Wikidata SPARQL — ongoing armed conflicts with coordinates
// Fully open, no registration, no API key
// Proxied through /proxy/wikidata to avoid CORS
export async function fetchWikidataConflicts() {
  try {
    const res = await axios.get("/proxy/wikidata", { timeout: 20000 });
    const conflicts = res.data?.conflicts || [];
    return conflicts.filter(c => c.lat !== null && c.lng !== null);
  } catch (err) {
    console.warn("Wikidata fetch failed:", err.message);
    return getMockWikidata();
  }
}

function getMockWikidata() {
  return [
    { id:"wd-m1", name:"Russo-Ukrainian War", country:"Ukraine", lat:48.38, lng:31.17, startDate:"2022-02-24", endDate:"", casualties:50000, status:"ongoing", source:"Wikidata", wikiUrl:"https://www.wikidata.org/wiki/Q110999040" },
    { id:"wd-m2", name:"2023 Sudan conflict", country:"Sudan", lat:15.55, lng:32.53, startDate:"2023-04-15", endDate:"", casualties:12000, status:"ongoing", source:"Wikidata", wikiUrl:"https://www.wikidata.org/wiki/Q117044493" },
    { id:"wd-m3", name:"Gaza–Israel conflict 2023", country:"Palestine", lat:31.35, lng:34.31, startDate:"2023-10-07", endDate:"", casualties:35000, status:"ongoing", source:"Wikidata", wikiUrl:"https://www.wikidata.org/wiki/Q120522539" },
    { id:"wd-m4", name:"Myanmar civil war", country:"Myanmar", lat:19.76, lng:96.08, startDate:"2021-02-01", endDate:"", casualties:8000, status:"ongoing", source:"Wikidata", wikiUrl:"https://www.wikidata.org/wiki/Q105388524" },
    { id:"wd-m5", name:"Tigray War", country:"Ethiopia", lat:13.50, lng:39.47, startDate:"2020-11-04", endDate:"2022-11-02", casualties:300000, status:"resolved", source:"Wikidata", wikiUrl:"https://www.wikidata.org/wiki/Q96678045" },
    { id:"wd-m6", name:"Yemeni civil war", country:"Yemen", lat:15.55, lng:48.52, startDate:"2014-09-16", endDate:"", casualties:150000, status:"ongoing", source:"Wikidata", wikiUrl:"https://www.wikidata.org/wiki/Q18013771" },
    { id:"wd-m7", name:"Syrian civil war", country:"Syria", lat:34.80, lng:38.99, startDate:"2011-03-15", endDate:"", casualties:500000, status:"ongoing", source:"Wikidata", wikiUrl:"https://www.wikidata.org/wiki/Q189378" },
    { id:"wd-m8", name:"Kivu conflict", country:"DRC", lat:-1.67, lng:29.22, startDate:"2004-01-01", endDate:"", casualties:6000000, status:"ongoing", source:"Wikidata", wikiUrl:"https://www.wikidata.org/wiki/Q1130169" },
    { id:"wd-m9", name:"Somali Civil War", country:"Somalia", lat:2.04, lng:45.34, startDate:"1991-01-26", endDate:"", casualties:500000, status:"ongoing", source:"Wikidata", wikiUrl:"https://www.wikidata.org/wiki/Q217329" },
    { id:"wd-m10", name:"Afghan conflict 2021–present", country:"Afghanistan", lat:33.93, lng:67.71, startDate:"2021-08-15", endDate:"", casualties:5000, status:"ongoing", source:"Wikidata", wikiUrl:"https://www.wikidata.org/wiki/Q108004311" },
  ];
}
