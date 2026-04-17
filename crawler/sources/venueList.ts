// Curated list of Central Ohio venues and event sites to scrape.
// Each entry has a URL (events/calendar page) and a display name.
// Add new venues here — the schema.org scraper handles the rest automatically.
//
// MAINTENANCE NOTES:
// - Venue URLs change frequently. Re-audit broken URLs before each major release.
// - 403 errors usually mean the site blocks crawlers — remove those entries.
// - ENOTFOUND means the domain is wrong — look up the correct domain.
// - Sites behind Cloudflare (runningintheusa.com, etc.) cannot be scraped server-side.

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

  // ── Music Venues ─────────────────────────────────────────────────────────
  // PromoWest operates KEMBA Live!, Newport, and Express Live — check their main page
  { url: "https://www.promowestlive.com/columbus", name: "PromoWest Venues Columbus", category: "music" },
  { url: "https://www.liveatthebluestone.com/concerts/calendar/", name: "The Bluestone", category: "music" },
  { url: "https://www.aramusic.com/events", name: "A&R Music Bar", category: "music" },
  { url: "https://woodlandstavern.com/", name: "Woodlands Tavern", category: "music" },
  { url: "https://www.capa.com/events", name: "CAPA Columbus", category: "music" },
  { url: "https://www.capa.com/palace-theatre/", name: "Palace Theatre Columbus", category: "music" },
  { url: "https://www.newportmusichall.org/events/", name: "Newport Music Hall", category: "music" },

  // ── Arts & Culture ────────────────────────────────────────────────────────
  { url: "https://www.columbusmuseum.org/events", name: "Columbus Museum of Art", category: "arts" },
  { url: "https://cosi.org/visit/hours-events-calendar", name: "COSI", category: "arts" },
  { url: "https://www.fpconservatory.org/events/", name: "Franklin Park Conservatory", category: "arts" },
  { url: "https://www.shadowboxlive.org/events", name: "Shadowbox Live", category: "arts" },
  { url: "https://columbussymphony.com/", name: "Columbus Symphony", category: "arts" },
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
  // Columbus Convention Center — use base domain (www. causes cert mismatch)
  { url: "https://columbusconventions.com/calendar", name: "Greater Columbus Convention Center", category: "community" },

  // ── Outdoor & Recreation ──────────────────────────────────────────────────
  { url: "https://outdoor-pursuits.org/all-events", name: "Columbus Outdoor Pursuits", category: "outdoors" },
  { url: "https://www.metroparks.net/events", name: "Columbus Metro Parks", category: "outdoors" },
  // ohio.bike returns 429 (rate limit) — removed
  // trekohio.com/events returns 404 — removed

  // ── Food & Drink ──────────────────────────────────────────────────────────
  { url: "https://northmarket.org/events/", name: "North Market Columbus", category: "food" },
  { url: "https://www.ohiocraftbeer.org/events", name: "Ohio Craft Brewers Association", category: "food" },
  // columbusfoodtruckfest.com/events 404 — festival is seasonal, check base domain
  { url: "https://www.columbusfoodtruckfest.com/", name: "Columbus Food Truck Festival", category: "food" },

  // ── Races ─────────────────────────────────────────────────────────────────
  // Note: Columbus Marathon (columbusmarathon.com) is Wix/JS-rendered — handled
  // via KNOWN_MAJOR_RACES in races.ts, not here.
  // Capital City Half Marathon — also in KNOWN_MAJOR_RACES
  { url: "https://capitalcityhalfmarathon.com/", name: "Capital City Half Marathon", category: "outdoors" },

  // ── Suburban Cities ───────────────────────────────────────────────────────
  // Cities that block crawlers (403) are removed; they are covered by ICS feeds instead.
  { url: "https://www.visitdublinohio.com/events/", name: "Visit Dublin Ohio", category: "community" },
  // Bridge Park — mixed-use development in Dublin with frequent events (markets, concerts, etc.)
  { url: "https://www.bridgepark.com/events/", name: "Bridge Park Dublin", category: "community" },
  { url: "https://www.hilliardohio.gov/events", name: "City of Hilliard", category: "community" },
  { url: "https://www.visitgahanna.com/Events/", name: "Visit Gahanna", category: "community" },
  { url: "https://visitgrovecity.com/events/", name: "Visit Grove City", category: "community" },
  // Westerville, Powell, Bexley, Delaware all return 403 — covered by ICS feeds
];
