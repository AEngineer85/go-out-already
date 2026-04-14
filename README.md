# go out already

> Central Ohio events, all in one place.

A personal web app that automatically crawls the internet nightly for local events across the Central Ohio region, presents them in a responsive filterable interface, and enables bulk-adding selected events to Google Calendar.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend + API | Next.js 14 (App Router) |
| Auth | NextAuth.js v5 + Google OAuth |
| Database | PostgreSQL (Railway/Supabase) |
| ORM | Prisma |
| Scraping (dynamic) | Playwright (headless Chromium) |
| Scraping (static) | Axios + Cheerio |
| ICS/iCal | node-ical |
| RSS | rss-parser |
| Geocoding | Nominatim (OpenStreetMap, free) |
| Email alerts | Nodemailer + Gmail SMTP |
| Calendar | Google Calendar API v3 |
| Scheduler | Railway Cron / Vercel Cron |

## Setup

### 1. Clone and install

```bash
npm install
cd crawler && npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

Required:
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from Google Cloud Console
- `ENCRYPTION_KEY` — 32-byte hex, generate with `openssl rand -hex 32`
- `ALERT_EMAIL_FROM` / `ALERT_EMAIL_APP_PASSWORD` — Gmail with App Password enabled

### 3. Database

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Run locally

```bash
# Next.js app
npm run dev

# Crawler (separate terminal)
cd crawler && npm run crawl
```

## Deployment

### Recommended architecture

- **Vercel** — Next.js frontend + API routes
- **Railway Service 1** — PostgreSQL database
- **Railway Service 2** — Node.js crawler service (`crawler/`)
- **Railway Cron** — triggers `POST /run` nightly at 2:00 AM ET

### Google OAuth setup

1. Create a project at console.cloud.google.com
2. Enable **Google Calendar API** and **Google+ API**
3. Create OAuth 2.0 credentials (Web application)
4. Add authorized redirect URI: `https://your-domain.com/api/auth/callback/google`
5. Request scopes: `openid`, `email`, `profile`, `https://www.googleapis.com/auth/calendar.events`

## Event Sources

The crawler pulls from sources including:
- Columbus Rec & Parks (ICS feed + Playwright)
- Metro Parks, COSI, Columbus Museum of Art (ICS feeds)
- Experience Columbus, Columbus Underground, 614 Magazine (HTML scraping)
- Columbus Dispatch, Columbus Alive, Patch (RSS feeds)
- RunSignUp (HTML scraping)
- Eventbrite (public API)
- ThisWeek News, Delaware Gazette (RSS)

## Features

- **Nightly crawl** at 2:00 AM ET across 20+ Central Ohio sources
- **Smart deduplication** via fingerprint hash (title + date + location)
- **Auto-tagging** with 15 tag categories using keyword matching
- **Relevance scoring** for Top Picks (multi-source boost, metadata completeness, recency)
- **Bulk add to Google Calendar** with configurable reminders
- **Duplicate prevention** — won't re-add events already in your calendar
- **Filter by** tag, date range, recently crawled, hide already-added
- **Failure alerts** via email when crawl yields zero events
