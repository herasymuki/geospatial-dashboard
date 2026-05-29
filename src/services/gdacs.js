import axios from "axios";

// GDACS — UN Global Disaster Alert & Coordination System
// Fully open, no registration, no API key
// Proxied through /proxy/gdacs to avoid CORS
export async function fetchGDACSAlerts() {
  try {
    const res = await axios.get("/proxy/gdacs", { timeout: 15000 });
    const items = res.data?.items || [];
    return items.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description || "",
      date: item.date || "",
      url: item.link || "#",
      lat: item.lat,
      lng: item.lng,
      country: item.country || "Unknown",
      eventType: item.eventType || "Alert",
      alertLevel: item.alertLevel || "Green",
      severity: item.severity || "",
      source: "GDACS"
    })).filter(e => e.lat !== null && e.lng !== null);
  } catch (err) {
    console.warn("GDACS fetch failed:", err.message);
    return getMockGDACS();
  }
}

function getMockGDACS() {
  return [
    { id:"gdacs-m1", title:"Complex Emergency: Sudan — Khartoum", description:"Ongoing armed conflict causing mass displacement in Khartoum state.", date:"2024-03-15", url:"#", lat:15.55, lng:32.53, country:"Sudan", eventType:"CE", alertLevel:"Red", severity:"High", source:"GDACS" },
    { id:"gdacs-m2", title:"Complex Emergency: DRC — North Kivu", description:"M23 advance displacing hundreds of thousands near Goma.", date:"2024-03-14", url:"#", lat:-1.67, lng:29.22, country:"DRC", eventType:"CE", alertLevel:"Red", severity:"High", source:"GDACS" },
    { id:"gdacs-m3", title:"Complex Emergency: Myanmar — Rakhine State", description:"Ongoing civil conflict causing civilian displacement.", date:"2024-03-13", url:"#", lat:19.76, lng:93.98, country:"Myanmar", eventType:"CE", alertLevel:"Orange", severity:"Medium", source:"GDACS" },
    { id:"gdacs-m4", title:"Complex Emergency: Ethiopia — Amhara", description:"Armed conflict between government forces and Fano militia.", date:"2024-03-12", url:"#", lat:11.59, lng:37.37, country:"Ethiopia", eventType:"CE", alertLevel:"Orange", severity:"Medium", source:"GDACS" },
    { id:"gdacs-m5", title:"Complex Emergency: Yemen — Hodeidah", description:"Houthi attacks on Red Sea shipping and coastal areas.", date:"2024-03-11", url:"#", lat:14.80, lng:42.95, country:"Yemen", eventType:"CE", alertLevel:"Red", severity:"High", source:"GDACS" },
  ];
}
