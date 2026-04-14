// Curated list of Central Ohio venues and event sites to scrape.
// Each entry has a URL (events/calendar page) and a display name.
// Add new venues here — the schema.org scraper handles the rest automatically.

export interface VenueConfig {
  url: string;
  name: string;
  category: string;
}

export const VENUE_LIST: VenueConfig[] = [
  // ── Farms & Agritourism ──────────────────────────────────────────────────
  { url: "https://www.henmick.com/thismonth", name: "Henmick Farm & Brewery", category: "farm" },
  { url: "https://www.henmick.com/weekly-schedule", name: "Henmick Farm & Brewery", category: "farm" },
  { url: "https://lyndfruitfarm.com/events", name: "Lynd Fruit Farm", category: "farm" },
  { url: "https://www.timbuk.com/events", name: "Timbuk Farms", category: "farm" },
  { url: "https://www.lyndfruitfarm.com/events-calendar", name: "Lynd Fruit Farm Calendar", category: "farm" },

  // ── Music Venues ─────────────────────────────────────────────────────────
  // Note: venue URLs need periodic auditing — venue websites change frequently.
  // KEMBA Live!, Newport, and The Bluestone are operated by Live Nation / PromoWest.
  { url: "https://www.promowestlive.com/columbus", name: "PromoWest Venues Columbus", category: "music" },
  { url: "https://www.kembalive.com/events", name: "KEMBA Live!", category: "music" },
  { url: "https://thebluestonecols.com/events", name: "The Bluestone", category: "music" },
  { url: "https://www.aramusic.com/events", name: "A&R Music Bar", category: "music" },
  { url: "https://www.woodlandstavern.com/events", name: "Woodlands Tavern", category: "music" },
  { url: "https://www.capa.com/events", name: "CAPA Columbus", category: "music" },
  { url: "https://www.palacetheatrecolumbus.com/events", name: "Palace Theatre", category: "music" },
  { url: "https://www.newportmusichair.com/events", name: "Newport Music Hall", category: "music" },

  // ── Arts & Culture ────────────────────────────────────────────────────────
  { url: "https://www.columbusmuseum.org/events", name: "Columbus Museum of Art", category: "arts" },
  { url: "https://www.cosi.org/events", name: "COSI", category: "arts" },
  { url: "https://www.fpconservancy.org/events", name: "Franklin Park Conservancy", category: "arts" },
  { url: "https://www.shadowboxlive.org/events", name: "Shadowbox Live", category: "arts" },
  { url: "https://www.columbussymphony.com/concerts-events", name: "Columbus Symphony", category: "arts" },
  { url: "https://www.gcac.org/events", name: "Greater Columbus Arts Council", category: "arts" },
  { url: "https://www.wexarts.org/events", name: "Wexner Center for the Arts", category: "arts" },
  { url: "https://www.shortnorth.org/events", name: "Short North Arts District", category: "arts" },
  { url: "https://www.franklintonartsdistrict.com/events", name: "Franklinton Arts District", category: "arts" },
  { url: "https://germanvillage.com/events", name: "German Village Society", category: "arts" },
  { url: "https://www.columbuszoo.org/events", name: "Columbus Zoo & Aquarium", category: "arts" },
  { url: "https://www.ohiohistory.org/events-experiences", name: "Ohio History Connection", category: "arts" },

  // ── Community & Neighborhoods ─────────────────────────────────────────────
  { url: "https://www.alwaysuptown.com/events", name: "Uptown Columbus (Delaware)", category: "community" },
  { url: "https://www.experiencecolumbus.com/events", name: "Experience Columbus", category: "community" },
  { url: "https://www.columbusonthecheap.com/events", name: "Columbus on the Cheap", category: "community" },
  { url: "https://stepoutcolumbus.com/all-events", name: "Step Out Columbus", category: "community" },
  { url: "https://ohiofestivals.net/ohio-festivals/columbus-festivals", name: "Ohio Festivals - Columbus", category: "community" },
  { url: "https://www.614now.com/events", name: "614 Magazine", category: "community" },
  { url: "https://www.columbusconventions.com/calendar", name: "Greater Columbus Convention Center", category: "community" },

  // ── Outdoor & Recreation ──────────────────────────────────────────────────
  { url: "https://outdoor-pursuits.org/all-events", name: "Columbus Outdoor Pursuits", category: "outdoors" },
  { url: "https://ohio.bike/bicycle-touring-events", name: "Ohio Bicycle Events", category: "outdoors" },
  { url: "https://www.metroparks.net/events", name: "Columbus Metro Parks", category: "outdoors" },
  { url: "https://trekohio.com/events", name: "TrekOhio", category: "outdoors" },

  // ── Food & Drink ──────────────────────────────────────────────────────────
  { url: "https://www.columbusfoodtruckfest.com/events", name: "Columbus Food Truck Festival", category: "food" },
  { url: "https://www.northmarketcolumbus.com/events", name: "North Market Columbus", category: "food" },
  { url: "https://www.northmarketpowell.com/events", name: "North Market Powell", category: "food" },
  { url: "https://www.ohiocraftbeer.org/events", name: "Ohio Craft Brewers Association", category: "food" },

  // ── Suburban Cities ───────────────────────────────────────────────────────
  { url: "https://www.dublinohiousa.gov/events", name: "City of Dublin", category: "community" },
  { url: "https://www.westerville.org/events", name: "City of Westerville", category: "community" },
  { url: "https://www.hilliardohio.gov/events", name: "City of Hilliard", category: "community" },
  { url: "https://www.cityofpowell.us/events", name: "City of Powell", category: "community" },
  { url: "https://www.gahanna.gov/events", name: "City of Gahanna", category: "community" },
  { url: "https://www.groveportal.org/events", name: "City of Grove City", category: "community" },
  { url: "https://www.bexley.org/events", name: "City of Bexley", category: "community" },
  { url: "https://www.delawareohio.net/events", name: "City of Delaware", category: "community" },
];
