import axios from "axios";

// ReliefWeb API — fully open
// Docs: https://reliefweb.int/help/api
const BASE = "https://api.reliefweb.int/v1/disasters";

export async function fetchReliefWebCrises() {
  try {
    const payload = {
      filter: { field: "type.name", value: ["Conflict", "Civil Unrest", "Violence"], operator: "OR" },
      fields: { include: ["name","country","date","status","type","glide","url"] },
      limit: 50,
      sort: ["date.created:desc"]
    };
    const res = await axios.post(BASE, payload, {
      params: { appname: "global-conflicts-athena", limit: 50 },
      timeout: 15000
    });
    return (res.data?.data || []).map(d => ({
      id: d.id,
      name: d.fields?.name || "Unknown",
      country: d.fields?.country?.[0]?.name || "Unknown",
      date: d.fields?.date?.created || "",
      status: d.fields?.status || "ongoing",
      type: d.fields?.type?.[0]?.name || "Conflict",
      url: d.fields?.url || "#"
    }));
  } catch (err) {
    console.warn("ReliefWeb fetch failed, using mock data:", err.message);
    return getMockReliefData();
  }
}

function getMockReliefData() {
  return [
    { id:"rw1", name:"Ukraine: Armed Conflict", country:"Ukraine", date:"2022-02-24", status:"ongoing", type:"Conflict", url:"#" },
    { id:"rw2", name:"Sudan: Armed Conflict", country:"Sudan", date:"2023-04-15", status:"ongoing", type:"Conflict", url:"#" },
    { id:"rw3", name:"Gaza: Armed Conflict", country:"Palestine", date:"2023-10-07", status:"ongoing", type:"Conflict", url:"#" },
    { id:"rw4", name:"Myanmar: Civil Conflict", country:"Myanmar", date:"2021-02-01", status:"ongoing", type:"Civil Unrest", url:"#" },
    { id:"rw5", name:"Ethiopia: Amhara Conflict", country:"Ethiopia", date:"2023-04-01", status:"ongoing", type:"Conflict", url:"#" },
    { id:"rw6", name:"DRC: M23 Conflict", country:"DRC", date:"2021-11-01", status:"ongoing", type:"Conflict", url:"#" },
    { id:"rw7", name:"Somalia: Al-Shabaab Insurgency", country:"Somalia", date:"2007-01-01", status:"ongoing", type:"Conflict", url:"#" },
    { id:"rw8", name:"Yemen: Civil War", country:"Yemen", date:"2015-03-26", status:"ongoing", type:"Conflict", url:"#" },
    { id:"rw9", name:"Syria: Civil War", country:"Syria", date:"2011-03-15", status:"ongoing", type:"Conflict", url:"#" },
    { id:"rw10", name:"Mali: Sahel Insurgency", country:"Mali", date:"2012-01-01", status:"ongoing", type:"Conflict", url:"#" },
  ];
}
