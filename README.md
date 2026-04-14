# go out already

> Central Ohio events, all in one place.

A personal web app that automatically crawls the internet nightly for local events across the Central Ohio region, presents them in a responsive filterable interface, and enables bulk-adding selected events to Google Calendar.

**Live:** https://go-out-already.vercel.app

📄 **Full documentation:** See [PRD.md](./PRD.md) — includes complete setup guide, deployment instructions, and architecture decisions.

## Quick Start

```bash
# Requires Node 20 (not 22+)
nvm use 20

# Install dependencies
npm install
cd crawler && npm install && cd ..

# Set up environment variables
cp .env.example .env
# Fill in values — see PRD.md §12 for detailed instructions

# Initialize database
npx prisma migrate dev --name init
npx prisma generate
cd crawler && npx prisma generate && cd ..

# Run locally
npm run dev                    # Next.js app at localhost:3000
cd crawler && npm run crawl    # Run crawler once
```

## Tech Stack

| Layer | Technology | Hosting |
|-------|-----------|---------|
| Frontend + API | Next.js 14 (App Router) | Vercel (free) |
| Auth | NextAuth.js v5 + Google OAuth | — |
| Database | PostgreSQL | Supabase (free) |
| ORM | Prisma 5 | — |
| Scraping (static) | Axios + Cheerio | Render (free) |
| Scraping (dynamic) | Playwright headless Chromium | Render (free) |
| ICS/iCal | node-ical | — |
| RSS | rss-parser | — |
| Sports APIs | MiLB Stats API, NHL API | Free, no key |
| Geocoding | Nominatim (OpenStreetMap) | Free, no key |
| Email alerts | Nodemailer + Gmail SMTP | Free |
| Calendar | Google Calendar API v3 | Free |
| Scheduler | Render Cron Job | Nightly 2:00 AM ET |

## Event Sources

- **ICS Feeds** (~20 sources): Columbus Rec & Parks, Metro Parks, COSI, Columbus Symphony, Short North, Shadowbox Live, city calendars, Columbus Clippers, and more
- **RSS Feeds**: Local news and media sites
- **Sports APIs**: Columbus Clippers (MiLB), Blue Jackets (NHL), Columbus Crew, Ohio State
- **Races**: RunSignUp, Columbus Marathon, OhioRaces.com
- **Schema.org Venue Scraper**: 50+ curated Central Ohio venues — farms, music, arts, community, outdoor, food, suburban city sites

## Features

- **Nightly crawl** across 50+ Central Ohio sources
- **Smart deduplication** via SHA-256 fingerprint hash (title + date + location)
- **Auto-tagging** with 15 tag categories using keyword matching
- **Relevance scoring** for Top Picks (multi-source boost, metadata completeness, recency)
- **Bulk add to Google Calendar** with configurable reminders
- **Duplicate prevention** — won't re-add events already in your calendar
- **Filter by** tag, date range, recently crawled, hide already-added
- **Failure alerts** via email when crawl yields zero events

## Deployment

See [PRD.md §12](./PRD.md#12-setup--deployment-guide) for the complete step-by-step deployment guide, including all known gotchas:

- Must use Node 20 (not 22+)
- Must use Prisma 5 (not 7)
- Supabase: use pooler URL port 6543 with `?pgbouncer=true`
- Render: install Playwright without `--with-deps`
- Crawler tsconfig must use `"module": "commonjs"`
