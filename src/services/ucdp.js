import axios from "axios";

// UCDP GED API — fully open
// Docs: https://ucdp.uu.se/apidocs/
const BASE = "https://ucdpapi.pcr.uu.se/api/gedevents/23.1";

export async function fetchUCDPConflicts(limit = 300) {
  try {
    const res = await axios.get(BASE, {
      params: { pagesize: limit, page: 1 },
      timeout: 15000
    });
    return res.data?.Result || [];
  } catch (err) {
    console.warn("UCDP fetch failed, using mock data:", err.message);
    return getMockUCDPData();
  }
}

function getMockUCDPData() {
  return [
    { id:"ucdp-1", latitude:"48.00", longitude:"37.80", country:"Ukraine", region:"Europe", type_of_violence_label:"State-based conflict", conflict_name:"Russia - Ukraine", best:"15000", date_start:"2022-02-24", side_a:"Government of Russia", side_b:"Government of Ukraine" },
    { id:"ucdp-2", latitude:"15.55", longitude:"32.53", country:"Sudan", region:"Africa", type_of_violence_label:"State-based conflict", conflict_name:"Sudan - RSF", best:"8000", date_start:"2023-04-15", side_a:"Government of Sudan", side_b:"RSF" },
    { id:"ucdp-3", latitude:"2.04", longitude:"45.34", country:"Somalia", region:"Africa", type_of_violence_label:"Non-state conflict", conflict_name:"Al-Shabaab insurgency", best:"3200", date_start:"2007-01-01", side_a:"Al-Shabaab", side_b:"AMISOM/SNA" },
    { id:"ucdp-4", latitude:"-1.67", longitude:"29.22", country:"Democratic Republic of Congo", region:"Africa", type_of_violence_label:"Non-state conflict", conflict_name:"M23 conflict", best:"2100", date_start:"2021-11-01", side_a:"M23", side_b:"FARDC" },
    { id:"ucdp-5", latitude:"34.80", longitude:"38.99", country:"Syria", region:"Middle East", type_of_violence_label:"State-based conflict", conflict_name:"Syrian Civil War", best:"22000", date_start:"2011-03-15", side_a:"Government of Syria", side_b:"Opposition" },
    { id:"ucdp-6", latitude:"15.35", longitude:"44.20", country:"Yemen", region:"Middle East", type_of_violence_label:"State-based conflict", conflict_name:"Yemen Civil War", best:"18000", date_start:"2015-03-26", side_a:"Houthi movement", side_b:"Saudi-led coalition" },
    { id:"ucdp-7", latitude:"33.93", longitude:"67.71", country:"Afghanistan", region:"Asia", type_of_violence_label:"Non-state conflict", conflict_name:"Afghanistan insurgency", best:"5400", date_start:"2001-10-07", side_a:"Taliban", side_b:"ISIS-K" },
    { id:"ucdp-8", latitude:"9.14", longitude:"40.49", country:"Ethiopia", region:"Africa", type_of_violence_label:"State-based conflict", conflict_name:"Tigray conflict", best:"12000", date_start:"2020-11-04", side_a:"Government of Ethiopia", side_b:"TPLF" },
    { id:"ucdp-9", latitude:"12.36", longitude:"43.15", country:"Djibouti", region:"Africa", type_of_violence_label:"One-sided violence", conflict_name:"Horn of Africa tensions", best:"120", date_start:"2023-01-01", side_a:"Armed group", side_b:"Civilians" },
    { id:"ucdp-10", latitude:"19.76", longitude:"96.08", country:"Myanmar", region:"Asia", type_of_violence_label:"State-based conflict", conflict_name:"Myanmar civil war", best:"7800", date_start:"2021-02-01", side_a:"Tatmadaw", side_b:"PDF/EAOs" },
  ];
}
