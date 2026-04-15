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
| ICS/iCal | node-ical | — |
| RSS | rss-parser | — |
| Sports APIs | MiLB Stats API, NHL API | Free, no key |
| Geocoding | Nominatim (OpenStreetMap) | Free, no key |
| Email alerts | Nodemailer + Gmail SMTP | Free |
| Calendar | Google Calendar API v3 | Free |
| Animation | framer-motion v11 | — |
| Scheduler | Render Cron Job | Nightly 2:00 AM ET |

## Event Sources

- **ICS Feeds** (~20 sources): Columbus Rec & Parks, Metro Parks, COSI, Columbus Symphony, Short North, Shadowbox Live, city calendars, Columbus Clippers, and more
- **RSS Feeds**: Local news and media sites
- **Sports APIs**: Columbus Clippers (MiLB), Blue Jackets (NHL), Columbus Crew, Ohio State
- **Races**: RunSignUp, OhioRaces.com (Columbus Marathon scraper removed — covered by ICS)
- **Schema.org Venue Scraper**: 50+ curated Central Ohio venues — farms, music, arts, community, outdoor, food, suburban city sites

## Features

- **Nightly crawl** across 50+ Central Ohio sources
- **Smart deduplication** via SHA-256 fingerprint hash (title + date + location)
- **Auto-tagging** with 15 tag categories using keyword matching
- **Relevance scoring** for Top Picks (multi-source boost, metadata completeness, recency)
- **Bulk add to Google Calendar** with configurable reminders
- **Duplicate prevention** — won't re-add events already in your calendar
- **Filter by** tag, date range, recently crawled, hide already-added, hide archived
- **Failure alerts** via email when crawl yields zero events

### Swipe Mode (`/swipe`)
A Tinder-style card swipe interface for rapid event discovery:
- **Swipe right** (or tap ♥) to save an event to your Saved list
- **Swipe left** (or tap ✕) to archive — event disappears from all views
- **Undo** button reverses the last swipe
- **Preference learning**: EMA algorithm tracks tag + source weights per user; after 5 swipes the queue is ranked by personal score instead of global relevance score
- **Cold start**: first 5 swipes use global `relevanceScore` for ordering; then personal weights take over
- **"Hide archived" toggle** on the main list view hides left-swiped events (authenticated users only)

### Saved Events (`/interested`)
- Lists all right-swiped events, most recently saved first
- Multi-select + bulk Add to Google Calendar (reuses existing calendar flow)

## Deployment

See [PRD.md §12](./PRD.md#12-setup--deployment-guide) for the complete step-by-step deployment guide, including all known gotchas:

- Must use Node 20 (not 22+)
- Must use Prisma 5 (not 7)
- Supabase: use pooler URL port 6543 with `?pgbouncer=true`
- Render: **Playwright removed** — was causing OOM on 512MB free tier; all dynamic sources replaced with ICS/static equivalents
- Crawler start script sets `NODE_OPTIONS=--max-old-space-size=460` as heap ceiling
- Crawler tsconfig must use `"module": "commonjs"`
- NextAuth v5 (beta 30): always look up users by `email`, not `session.user.id` — `token.sub` does not match `account.providerAccountId` in this setup

## Database Schema Notes

Three tables added for swipe mode (run `npx prisma migrate dev` to apply):

| Table | Purpose |
|-------|---------|
| `SwipeAction` | Per-user right/left decisions; `@@unique([userId, eventId])` allows re-swipe |
| `UserTagPreference` | EMA weight per tag per user; drives personalised queue ordering |
| `UserSourcePreference` | EMA weight per event source per user |

New fields on existing models:
- `User`: `swipeActions`, `tagPreferences`, `sourcePreferences` relations
- `Event`: `swipeActions` relation
