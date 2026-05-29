import axios from "axios";

// ACLED public API — no key required for basic access
// Docs: https://developer.acleddata.com/
const BASE = "https://api.acleddata.com/acled/read";

export async function fetchACLEDEvents(limit = 500) {
  try {
    const params = {
      limit,
      fields: "event_id_cnty|event_date|event_type|sub_event_type|country|region|latitude|longitude|fatalities|notes|actor1|actor2",
      "event_date": `${getDateNMonthsAgo(6)}|${today()}`,
      "event_date_where": "BETWEEN",
      "fatalities": "1",
      "fatalities_where": ">=",
    };
    const res = await axios.get(BASE, { params, timeout: 15000 });
    return res.data?.data || [];
  } catch (err) {
    console.warn("ACLED fetch failed, using mock data:", err.message);
    return getMockACLEDData();
  }
}

function today() { return new Date().toISOString().slice(0,10); }
function getDateNMonthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0,10);
}

function getMockACLEDData() {
  return [
    { event_id_cnty:"UA001", event_date:"2024-03-15", event_type:"Battles", sub_event_type:"Armed clash", country:"Ukraine", region:"Eastern Europe", latitude:"48.3794", longitude:"31.1656", fatalities:"12", notes:"Armed clash near Donetsk", actor1:"Ukrainian Armed Forces", actor2:"Russian Armed Forces" },
    { event_id_cnty:"SY001", event_date:"2024-03-10", event_type:"Explosions/Remote violence", sub_event_type:"Air/drone strike", country:"Syria", region:"Middle East", latitude:"34.8021", longitude:"38.9968", fatalities:"8", notes:"Airstrike in Deir ez-Zor", actor1:"Syrian Air Force", actor2:"Civilians" },
    { event_id_cnty:"SD001", event_date:"2024-03-12", event_type:"Battles", sub_event_type:"Armed clash", country:"Sudan", region:"Northern Africa", latitude:"12.8628", longitude:"30.2176", fatalities:"45", notes:"Clashes in Khartoum", actor1:"SAF", actor2:"RSF" },
    { event_id_cnty:"ET001", event_date:"2024-03-08", event_type:"Battles", sub_event_type:"Armed clash", country:"Ethiopia", region:"Eastern Africa", latitude:"9.1450", longitude:"40.4897", fatalities:"23", notes:"Conflict in Amhara region", actor1:"ENDF", actor2:"Fano militia" },
    { event_id_cnty:"MM001", event_date:"2024-03-14", event_type:"Battles", sub_event_type:"Armed clash", country:"Myanmar", region:"Southeast Asia", latitude:"19.7633", longitude:"96.0785", fatalities:"18", notes:"Clashes in Shan State", actor1:"Tatmadaw", actor2:"PDF" },
    { event_id_cnty:"YE001", event_date:"2024-03-11", event_type:"Explosions/Remote violence", sub_event_type:"Shelling/artillery/missile attack", country:"Yemen", region:"Middle East", latitude:"15.5527", longitude:"48.5164", fatalities:"7", notes:"Missile strike near Sanaa", actor1:"Houthi forces", actor2:"Saudi-led coalition" },
    { event_id_cnty:"IQ001", event_date:"2024-03-09", event_type:"Explosions/Remote violence", sub_event_type:"Air/drone strike", country:"Iraq", region:"Middle East", latitude:"33.2232", longitude:"43.6793", fatalities:"5", notes:"Drone strike in Anbar", actor1:"PMF", actor2:"ISIS remnants" },
    { event_id_cnty:"SO001", event_date:"2024-03-13", event_type:"Battles", sub_event_type:"Armed clash", country:"Somalia", region:"Eastern Africa", latitude:"5.1521", longitude:"46.1996", fatalities:"31", notes:"Al-Shabaab offensive", actor1:"Al-Shabaab", actor2:"Somali National Army" },
    { event_id_cnty:"CD001", event_date:"2024-03-07", event_type:"Battles", sub_event_type:"Armed clash", country:"Democratic Republic of Congo", region:"Central Africa", latitude:"-4.0383", longitude:"21.7587", fatalities:"19", notes:"M23 advance in North Kivu", actor1:"M23/RDF", actor2:"FARDC" },
    { event_id_cnty:"ML001", event_date:"2024-03-06", event_type:"Battles", sub_event_type:"Armed clash", country:"Mali", region:"Western Africa", latitude:"17.5707", longitude:"-3.9962", fatalities:"14", notes:"JNIM attack on village", actor1:"JNIM", actor2:"Malian Armed Forces" },
    { event_id_cnty:"NG001", event_date:"2024-03-05", event_type:"Violence against civilians", sub_event_type:"Attack", country:"Nigeria", region:"Western Africa", latitude:"9.0820", longitude:"8.6753", fatalities:"22", notes:"Boko Haram attack", actor1:"Boko Haram", actor2:"Civilians" },
    { event_id_cnty:"AF001", event_date:"2024-03-04", event_type:"Explosions/Remote violence", sub_event_type:"Suicide bomb", country:"Afghanistan", region:"South Asia", latitude:"33.9391", longitude:"67.7100", fatalities:"16", notes:"Suicide bombing in Kabul", actor1:"ISIS-K", actor2:"Civilians" },
    { event_id_cnty:"PK001", event_date:"2024-03-03", event_type:"Battles", sub_event_type:"Armed clash", country:"Pakistan", region:"South Asia", latitude:"30.3753", longitude:"69.3451", fatalities:"9", notes:"TTP attack in KPK", actor1:"TTP", actor2:"Pakistan Army" },
    { event_id_cnty:"MX001", event_date:"2024-03-02", event_type:"Violence against civilians", sub_event_type:"Attack", country:"Mexico", region:"Central America", latitude:"23.6345", longitude:"-102.5528", fatalities:"11", notes:"Cartel violence in Sinaloa", actor1:"Sinaloa Cartel", actor2:"CJNG" },
    { event_id_cnty:"LY001", event_date:"2024-03-01", event_type:"Battles", sub_event_type:"Armed clash", country:"Libya", region:"Northern Africa", latitude:"26.3351", longitude:"17.2283", fatalities:"6", notes:"Clashes in Tripoli outskirts", actor1:"GNU forces", actor2:"LNA" },
  ];
}
