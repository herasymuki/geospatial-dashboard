import axios from "axios";

// RSS feeds via rss2json proxy (free tier, no key needed)
const PROXY = "https://api.rss2json.com/v1/api.json";

const FEEDS = [
  { name: "Reuters Conflicts", url: "https://feeds.reuters.com/reuters/topNews" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
  { name: "BBC World", url: "http://feeds.bbci.co.uk/news/world/rss.xml" },
];

const CONFLICT_KEYWORDS = ["war","conflict","attack","military","bomb","missile","troops","ceasefire","offensive","insurgent","rebel","airstrike","casualties","killed","fighting","battle","siege","occupation","invasion"];

export async function fetchRSS() {
  const results = [];
  await Promise.allSettled(
    FEEDS.map(async feed => {
      try {
        const res = await axios.get(PROXY, {
          params: { rss_url: feed.url, count: 20 },
          timeout: 10000
        });
        const items = res.data?.items || [];
        items.forEach(item => {
          const text = `${item.title} ${item.description}`.toLowerCase();
          const relevant = CONFLICT_KEYWORDS.some(k => text.includes(k));
          if (relevant) {
            results.push({
              id: item.guid || item.link,
              title: item.title,
              description: item.description?.replace(/<[^>]*>/g,"").slice(0,200) || "",
              url: item.link,
              date: item.pubDate,
              source: feed.name,
              image: item.thumbnail || item.enclosure?.link || null
            });
          }
        });
      } catch (e) {
        console.warn(`RSS feed ${feed.name} failed:`, e.message);
      }
    })
  );
  return results.length > 0 ? results : getMockNews();
}

function getMockNews() {
  return [
    { id:"n1", title:"Ukraine frontline: Fierce battles reported in Zaporizhzhia region", description:"Ukrainian forces repelled multiple Russian assaults along the Zaporizhzhia front overnight, military sources say.", url:"#", date:"2024-03-15", source:"Reuters Conflicts" },
    { id:"n2", title:"Sudan: UN warns of catastrophic humanitarian situation in Khartoum", description:"The UN has issued an urgent appeal for access to civilians trapped in the Sudanese capital.", url:"#", date:"2024-03-14", source:"BBC World" },
    { id:"n3", title:"Gaza ceasefire negotiations resume in Cairo", description:"Mediators from Egypt and Qatar are facilitating new rounds of talks between Israeli and Hamas delegations.", url:"#", date:"2024-03-13", source:"Al Jazeera" },
    { id:"n4", title:"Myanmar: Resistance forces capture key military outpost in Shan State", description:"The Three Brotherhood Alliance claims control of a strategic base near the Chinese border.", url:"#", date:"2024-03-12", source:"Reuters Conflicts" },
    { id:"n5", title:"Houthi attacks disrupt Red Sea trade routes for third consecutive week", description:"Shipping companies are rerouting vessels around the Cape of Good Hope to avoid missile threats.", url:"#", date:"2024-03-11", source:"BBC World" },
    { id:"n6", title:"DRC: Goma under threat as M23 advances from the north", description:"Hundreds of thousands of civilians are fleeing the city as rebel forces approach.", url:"#", date:"2024-03-10", source:"Al Jazeera" },
  ];
}
