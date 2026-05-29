import axios from "axios";

// RSS feeds — fetched and parsed server-side via /proxy/rss
// Server directly fetches BBC, Al Jazeera, AP News XML — no third-party service
export async function fetchRSS() {
  try {
    const res = await axios.get("/proxy/rss", { timeout: 15000 });
    const items = res.data?.items || [];
    return items.map(item => ({
      id: item.id || item.guid,
      title: item.title,
      description: item.description || "",
      url: item.url || "#",
      date: item.date || "",
      source: item.source,
      image: null
    }));
  } catch (err) {
    console.warn("RSS fetch failed:", err.message);
    return getMockNews();
  }
}

function getMockNews() {
  return [
    { id:"n1", title:"Ukraine frontline: Fierce battles reported in Zaporizhzhia region", description:"Ukrainian forces repelled multiple Russian assaults along the Zaporizhzhia front overnight.", url:"#", date:"2024-03-15", source:"BBC World" },
    { id:"n2", title:"Sudan: UN warns of catastrophic humanitarian situation in Khartoum", description:"The UN has issued an urgent appeal for access to civilians trapped in the Sudanese capital.", url:"#", date:"2024-03-14", source:"BBC World" },
    { id:"n3", title:"Gaza ceasefire negotiations resume in Cairo", description:"Mediators from Egypt and Qatar are facilitating new rounds of talks between Israeli and Hamas delegations.", url:"#", date:"2024-03-13", source:"Al Jazeera" },
    { id:"n4", title:"Myanmar: Resistance forces capture key military outpost in Shan State", description:"The Three Brotherhood Alliance claims control of a strategic base near the Chinese border.", url:"#", date:"2024-03-12", source:"AP News" },
    { id:"n5", title:"Houthi attacks disrupt Red Sea trade routes for third consecutive week", description:"Shipping companies are rerouting vessels around the Cape of Good Hope to avoid missile threats.", url:"#", date:"2024-03-11", source:"BBC World" },
    { id:"n6", title:"DRC: Goma under threat as M23 advances from the north", description:"Hundreds of thousands of civilians are fleeing the city as rebel forces approach.", url:"#", date:"2024-03-10", source:"Al Jazeera" },
  ];
}
