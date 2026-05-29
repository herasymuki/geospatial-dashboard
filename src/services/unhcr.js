import axios from "axios";

// UNHCR Population API v1 — fully open, no registration, no API key
// Returns refugee flows and IDP data for globe arc visualization
// Proxied through /proxy/unhcr to avoid CORS

// Country centroid coordinates for arc visualization
const COUNTRY_COORDS = {
  SYR: [38.99, 34.80], AFG: [67.71, 33.93], VEN: [-66.59, 6.42],
  SSD: [31.30, 6.88],  MMR: [96.08, 19.76], COD: [21.76, -4.04],
  UKR: [31.17, 48.38], SDN: [30.22, 12.86], ETH: [40.49, 9.14],
  SOM: [46.20, 5.15],  NGA: [8.68, 9.08],   MLI: [-3.99, 17.57],
  CAF: [20.94, 6.61],  BFA: [-1.56, 12.36], MOZ: [35.53, -18.67],
  HTI: [-72.29, 18.97],IRQ: [43.68, 33.22], PSE: [35.23, 31.95],
  LBY: [17.23, 26.34], YEM: [48.52, 15.55], PAK: [69.35, 30.38],
  COL: [-74.30, 4.57], DEU: [10.45, 51.17], TUR: [35.24, 38.96],
  UGA: [32.29, 1.37],  KEN: [37.91, -0.02], ETH: [40.49, 9.14],
  BGD: [90.36, 23.68], IRN: [53.69, 32.43], LBN: [35.86, 33.85],
  JOR: [36.24, 30.59], EGY: [30.80, 26.82], TZA: [34.89, -6.37],
  CMR: [12.35, 3.85],  TCD: [18.73, 15.45], NER: [8.08, 17.61],
  GIN: [-11.81, 10.99],CIV: [-5.55, 7.54],  GHA: [-1.02, 7.95],
  USA: [-95.71, 37.09],CAN: [-96.80, 56.13],AUS: [133.78, -25.27],
  GBR: [-3.44, 55.38], FRA: [2.21, 46.23],  SWE: [18.64, 60.13],
  NOR: [8.47, 60.47],  CHE: [8.23, 46.82],  NLD: [5.29, 52.13],
  BEL: [4.47, 50.50],  AUT: [14.55, 47.52], GRC: [21.82, 39.07],
  ITA: [12.57, 41.87], ESP: [-3.75, 40.46], POL: [19.15, 51.92],
  CZE: [15.47, 49.82], HUN: [19.50, 47.16], ROU: [24.97, 45.94],
  SRB: [21.01, 44.02], HRV: [15.20, 45.10], MKD: [21.75, 41.61],
  BIH: [17.68, 43.92], ALB: [20.17, 41.15], MNE: [19.37, 42.71],
  RUS: [105.32, 61.52],CHN: [104.20, 35.86],IND: [78.96, 20.59],
  BRA: [-51.93, -14.24],ARG: [-63.62, -38.42],MEX: [-102.55, 23.63],
  ZAF: [25.08, -29.00],MAR: [-7.09, 31.79], TUN: [9.54, 33.89],
  DZA: [1.66, 28.03],  ERI: [39.78, 15.18], DJI: [42.59, 11.83],
  RWA: [29.87, -1.94], BDI: [29.92, -3.37], ZMB: [27.85, -13.13],
  ZWE: [29.15, -19.02],MWI: [34.30, -13.25],ANG: [17.87, -11.20],
};

function getCoords(iso) {
  return COUNTRY_COORDS[iso] || null;
}

export async function fetchUNHCRFlows() {
  try {
    const res = await axios.get("/proxy/unhcr", { timeout: 20000 });
    const { refugees = [], idps = [], totalRefugees = 0, totalIDPs = 0 } = res.data || {};

    // Build arc data: origin → asylum country
    const arcs = refugees
      .filter(r => r.individuals > 10000)
      .map(r => {
        const srcCoords = getCoords(r.originIso);
        const tgtCoords = getCoords(r.asylumIso);
        if (!srcCoords || !tgtCoords) return null;
        return {
          id: r.id,
          type: r.type,
          srcLat: srcCoords[1], srcLng: srcCoords[0],
          tgtLat: tgtCoords[1], tgtLng: tgtCoords[0],
          originCountry: r.originCountry,
          asylumCountry: r.asylumCountry,
          individuals: r.individuals,
          year: r.year,
          source: "UNHCR"
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.individuals - a.individuals)
      .slice(0, 80); // top 80 flows for performance

    // IDP points (same country displacement)
    const idpPoints = idps
      .filter(r => r.individuals > 50000)
      .map(r => {
        const coords = getCoords(r.originIso);
        if (!coords) return null;
        return {
          id: r.id,
          type: "IDP",
          lat: coords[1],
          lng: coords[0],
          country: r.originCountry,
          individuals: r.individuals,
          year: r.year,
          source: "UNHCR"
        };
      })
      .filter(Boolean);

    return { arcs, idpPoints, totalRefugees, totalIDPs };
  } catch (err) {
    console.warn("UNHCR fetch failed:", err.message);
    return getMockUNHCR();
  }
}

function getMockUNHCR() {
  return {
    totalRefugees: 35400000,
    totalIDPs: 62500000,
    arcs: [
      { id:"u1", type:"Refugees", srcLat:34.80, srcLng:38.99, tgtLat:36.20, tgtLng:37.16, originCountry:"Syria", asylumCountry:"Turkey", individuals:3600000, year:2023, source:"UNHCR" },
      { id:"u2", type:"Refugees", srcLat:33.93, srcLng:67.71, tgtLat:32.17, tgtLng:48.68, originCountry:"Afghanistan", asylumCountry:"Iran", individuals:3400000, year:2023, source:"UNHCR" },
      { id:"u3", type:"Refugees", srcLat:6.42, srcLng:-66.59, tgtLat:-0.23, tgtLng:-78.52, originCountry:"Venezuela", asylumCountry:"Ecuador", individuals:2400000, year:2023, source:"UNHCR" },
      { id:"u4", type:"Refugees", srcLat:6.88, srcLng:31.30, tgtLat:1.37, tgtLng:32.29, originCountry:"South Sudan", asylumCountry:"Uganda", individuals:2300000, year:2023, source:"UNHCR" },
      { id:"u5", type:"Refugees", srcLat:19.76, srcLng:96.08, tgtLat:23.68, tgtLng:90.36, originCountry:"Myanmar", asylumCountry:"Bangladesh", individuals:960000, year:2023, source:"UNHCR" },
      { id:"u6", type:"Refugees", srcLat:48.38, srcLng:31.17, tgtLat:51.92, tgtLng:19.15, originCountry:"Ukraine", asylumCountry:"Poland", individuals:960000, year:2023, source:"UNHCR" },
      { id:"u7", type:"Refugees", srcLat:9.14, srcLng:40.49, tgtLat:-1.94, tgtLng:29.87, originCountry:"Ethiopia", asylumCountry:"Rwanda", individuals:120000, year:2023, source:"UNHCR" },
      { id:"u8", type:"Refugees", srcLat:15.55, srcLng:32.53, tgtLat:15.45, tgtLng:18.73, originCountry:"Sudan", asylumCountry:"Chad", individuals:600000, year:2023, source:"UNHCR" },
      { id:"u9", type:"Refugees", srcLat:2.04, srcLng:46.20, tgtLat:-0.02, tgtLng:37.91, originCountry:"Somalia", asylumCountry:"Kenya", individuals:540000, year:2023, source:"UNHCR" },
      { id:"u10", type:"Refugees", srcLat:31.95, srcLng:35.23, tgtLat:33.85, tgtLng:35.86, originCountry:"Palestine", asylumCountry:"Lebanon", individuals:480000, year:2023, source:"UNHCR" },
    ],
    idpPoints: [
      { id:"idp1", type:"IDP", lat:34.80, lng:38.99, country:"Syria", individuals:6800000, year:2023, source:"UNHCR" },
      { id:"idp2", type:"IDP", lat:6.42, lng:-66.59, country:"Venezuela", individuals:5600000, year:2023, source:"UNHCR" },
      { id:"idp3", type:"IDP", lat:9.14, lng:40.49, country:"Ethiopia", individuals:4200000, year:2023, source:"UNHCR" },
      { id:"idp4", type:"IDP", lat:15.55, lng:32.53, country:"Sudan", individuals:3700000, year:2023, source:"UNHCR" },
      { id:"idp5", type:"IDP", lat:19.76, lng:96.08, country:"Myanmar", individuals:2600000, year:2023, source:"UNHCR" },
      { id:"idp6", type:"IDP", lat:-1.67, lng:29.22, country:"DRC", individuals:6900000, year:2023, source:"UNHCR" },
      { id:"idp7", type:"IDP", lat:15.55, lng:48.52, country:"Yemen", individuals:4500000, year:2023, source:"UNHCR" },
      { id:"idp8", type:"IDP", lat:48.38, lng:31.17, country:"Ukraine", individuals:3700000, year:2023, source:"UNHCR" },
    ]
  };
}
