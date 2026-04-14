# Go Out Already — Product Requirements Document

**Version 1.2 | April 2026**
**Status: Deployed — Live at https://go-out-already.vercel.app**
**Repo: https://github.com/AEngineer85/go-out-already**

> This document reflects the app as built and deployed. It supersedes the original v1.1 PDF PRD and incorporates all implementation decisions, architectural changes, and troubleshooting discovered during the initial build. It is intended to serve as the definitive reference for re-deploying this app to a new city or environment.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Brand & Design System](#2-brand--design-system)
3. [User & Auth](#3-user--auth)
4. [Crawl & Ingestion System](#4-crawl--ingestion-system)
5. [Data Model](#5-data-model)
6. [Event Tagging System](#6-event-tagging-system)
7. [Frontend — Web Application](#7-frontend--web-application)
8. [Google Calendar Integration](#8-google-calendar-integration)
9. [Tech Stack](#9-tech-stack)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Future Considerations](#11-future-considerations)
12. [Setup & Deployment Guide](#12-setup--deployment-guide)
13. [Adapting for a New City](#13-adapting-for-a-new-city)
14. [Resolved Questions & Implementation Notes](#14-resolved-questions--implementation-notes)

---

## 1. Product Overview

Go Out Already is a personal web application that automatically crawls the internet nightly for local events across a target region, presents them in a responsive filterable interface, and enables the user to bulk-add selected events to their Google Calendar — with built-in duplicate prevention and configurable reminders.

The app solves a genuine pain point: local events are scattered across dozens of sources (parks departments, race calendars, community orgs, local newspapers, small venue websites) with no single aggregator that does it well. Go Out Already is that aggregator.

The initial deployment targets Central Ohio. The architecture is designed to be region-agnostic — adding a new city requires only updating the venue list and geographic scope configuration (see [Section 13](#13-adapting-for-a-new-city)).

### 1.1 Goals

- Surface local events across a target region in one place, automatically
- Intelligently categorize events with a multi-tag taxonomy for easy filtering
- Enable frictionless Google Calendar integration with duplicate prevention
- Run autonomously — nightly crawls with failure alerts only when needed
- Zero recurring cost — built entirely on free/open-source tooling and free hosting tiers

### 1.2 Non-Goals (v1)

- Native iOS or Android application
- Multi-user or social features
- ML-based recommendations or personalization
- Paid ticketing or event registration flows
- User-submitted events
- Eventbrite integration (their API now requires a paid plan)
- Facebook Events scraping (too fragile; blocked by login walls)

---

## 2. Brand & Design System

Go Out Already uses a clean, minimal design language. White space does the heavy lifting; blue is used sparingly for interactive and active states only; and the typography carries the personality of the name. The design should feel like a modern iOS utility — native, calm, and purposeful.

### 2.1 Product Name

- **Name:** Go Out Already
- **Tagline:** Central Ohio events, all in one place.
- **Tone:** Self-aware, direct, slightly irreverent. The name acknowledges the inertia of staying home — and gives you a nudge.

### 2.2 Logo

| Element | Specification |
|---|---|
| Icon | Rounded square (rx=6), solid blue (#2563EB fill). White person-pin inside: circle head + arc body. Represents a person going somewhere. |
| Wordmark | "go out already" in Arial/system sans, medium weight (500), lowercase. "already" rendered in #2563EB. "go out" in near-black (#111111). |
| Lockup | Icon left, wordmark right. Or icon stacked above wordmark for compact/favicon use. |
| Favicon | Icon only, 32×32 and 180×180 (Apple touch icon). |
| Minimum size | Icon no smaller than 20×20px. Wordmark no smaller than 13px. |

### 2.3 Color Palette

| Role | Name | Hex | Usage |
|---|---|---|---|
| Primary | Blue 600 | #2563EB | Buttons, active states, links, logo accent, action bar |
| Primary dark | Blue 800 | #185FA5 | Hover states, pressed buttons, tag text |
| Primary light | Blue 50 | #E6F1FB | Tag backgrounds, selected card fill, info surfaces |
| Page background | Off-white | #F8F8F6 | App body background |
| Surface | White | #FFFFFF | Card backgrounds, nav bar, filter bar |
| Text primary | Near-black | #111111 | Titles, event names, primary labels |
| Text secondary | Gray | #555555 | Metadata, dates, locations |
| Text tertiary | Light gray | #999999 | Source names, hints, placeholders |
| Success / Added | Green 600 | #3B6D11 | "Added to calendar" badge text |
| Success light | Green 50 | #EAF3DE | Added badge background, free event tag |
| Border default | Translucent | rgba(0,0,0,0.12) | Card borders, dividers, filter bar border |

### 2.4 Typography

| Element | Font | Size | Weight | Color |
|---|---|---|---|---|
| Nav wordmark | System sans | 15px | 500 | #111 / #2563EB (accent) |
| Section heading | System sans | 15px | 500 | #111111 |
| Event card title | System sans | 14px | 500 | #111111 |
| Event metadata | System sans | 12px | 400 | #555555 |
| Tag labels | System sans | 11px | 500 | Per tag color (dark ramp) |
| Source attribution | System sans | 11px | 400 | #999999 |
| Action bar label | System sans | 13px | 500 | #FFFFFF |
| Filter pills | System sans | 12px | 400/500 active | #555 / #185FA5 active |
| Top pick date | System sans | 11px | 500 | #185FA5 |
| Top pick title | System sans | 13px | 500 | #111111 |

### 2.5 Spacing & Shape

| Token | Value | Usage |
|---|---|---|
| Border radius — card | 12px | Event cards, top pick cards, filter bar, action bar |
| Border radius — small | 8px | Tag pills, filter pills, avatar, checkboxes |
| Border radius — pill | 20px | Tag chips, filter chips (fully rounded) |
| Border radius — logo icon | 6px | App icon / logo square |
| Border width | 0.5px | All card and component borders |
| Card padding | 14–16px | Internal card padding |
| Section gap | 24px | Between major page sections |
| Card list gap | 8px | Between event cards in the list |
| Top picks gap | 10px | Between top pick cards |
| Filter pill gap | 8px | Between filter pills |
| Nav height | 52px | Top navigation bar |

### 2.6 Tag Color System

Tags are pill-shaped (border-radius: 20px), 11px medium weight text, 2px vertical / 7px horizontal padding.

| Tag | Background | Text color |
|---|---|---|
| Sporting events | #E6F1FB (Blue 50) | #185FA5 (Blue 800) |
| Races & runs | #E6F1FB (Blue 50) | #185FA5 (Blue 800) |
| Outdoors & nature | #E1F5EE (Teal 50) | #0F6E56 (Teal 600) |
| Festivals | #FAECE7 (Coral 50) | #993C1D (Coral 600) |
| Parades | #FAECE7 (Coral 50) | #993C1D (Coral 600) |
| Great for kids | #FAEEDA (Amber 50) | #854F0B (Amber 600) |
| Live music | #EEEDFE (Purple 50) | #3C3489 (Purple 800) |
| Arts & culture | #EEEDFE (Purple 50) | #3C3489 (Purple 800) |
| Food & drink | #E1F5EE (Teal 50) | #0F6E56 (Teal 600) |
| Community | #F1EFE8 (Gray 50) | #5F5E5A (Gray 600) |
| Education | #F1EFE8 (Gray 50) | #5F5E5A (Gray 600) |
| Pet-friendly | #FAEEDA (Amber 50) | #854F0B (Amber 600) |
| Seasonal / holiday | #FAECE7 (Coral 50) | #993C1D (Coral 600) |
| Fundraiser / charity | #FBEAF0 (Pink 50) | #993556 (Pink 600) |
| Free admission | #EAF3DE (Green 50) | #3B6D11 (Green 600) |

### 2.7 Key UI Patterns

**Navigation bar:** 52px tall, white background, 0.5px bottom border. Left: icon + wordmark lockup. Right: Settings text link + user avatar (initials circle, blue tint).

**Top picks section:** 3-column grid on desktop, horizontal scroll on mobile. Cards: white bg, 0.5px border, 12px radius, 14px padding. Blue date label at top, bold title, location row with pin icon, tag chips. "Added to calendar" green dot badge replaces checkbox when already added.

**Filter bar:** White background, 0.5px border, 10px radius. Pills: inactive = gray border + gray text; active = blue-50 fill + blue-800 text + blue-200 border. Vertical divider separates primary filters from utility filters (Recently added, Hide added).

**Event cards:** White bg, 0.5px border, 12px radius. Selected state: blue border (#2563EB) + very light blue fill (#F5F9FF). Checkbox: 18px, 4px radius. Checked = solid blue fill with white checkmark SVG. Multi-source events show all source names separated by middle dot. Already-added events: no checkbox; green dot + "Added to calendar" text.

**Action bar (bulk add):** Appears at bottom of event list when 1+ events selected. Solid blue (#2563EB) background, white text, white button. Left: selected count + sub-label. Right: "Add to calendar" button.

---

## 3. User & Auth

Go Out Already is designed as a single-user personal tool authenticated via Google OAuth 2.0. Google login is used because it provides natural access to Google Calendar without requiring separate credentials.

### 3.1 Authentication Flow

1. User navigates to app URL
2. App redirects to Google OAuth consent screen
3. User grants permissions: `profile`, `email`, `calendar.events` (write)
4. App receives OAuth tokens; **refresh token is AES-256-GCM encrypted** and stored in the database
5. User is logged in; session stores the Google subject ID (`sub`) as the user identifier
6. All subsequent calendar operations use stored credentials

### 3.2 Session Architecture (Important Implementation Detail)

- `session.user.id` = Google OAuth subject ID (the `sub` claim), **not** the internal database UUID
- All database lookups that need the current user must query by `googleId`, not `id`
- This is by design: NextAuth v5 beta's session callback returns `token.sub` most reliably

### 3.3 User Preferences (Persisted)

- Default calendar reminder time (1 hour, 1 day, 2 days, 1 week, custom minutes)
- Alert email address for crawl failure notifications

---

## 4. Crawl & Ingestion System

### 4.1 Schedule

A nightly cron job runs at 2:00 AM Eastern Time, configured as a Render Cron Job that calls `POST /run` on the crawler service. No external scheduling service required.

### 4.2 Geographic Scope (Central Ohio)

| Sub-Region | Example Cities/Areas |
|---|---|
| North | Delaware, Powell, Westerville, Worthington, Lewis Center |
| Northwest | Dublin, Hilliard, Marysville, Plain City |
| West | Hilliard, Grove City, Galloway |
| South | Pickerington, Canal Winchester, Circleville |
| East | Gahanna, Reynoldsburg, Newark, Heath |
| Urban Core | Columbus, Bexley, Upper Arlington, Grandview Heights |

### 4.3 Crawler Source Architecture

The crawler is a standalone Node.js service (`crawler/`) that runs independently of the Next.js app. It connects directly to the same PostgreSQL database.

Sources are organized into discrete modules. Each module is wrapped in a `try/catch` inside `runSource()` — an individual source failure never aborts the whole crawl.

#### Implemented Sources

**ICS / iCal Feeds** (`sources/icsFeeds.ts`) — ~20 feeds
Most reliable source type. Government and parks sites commonly publish ICS.
- Columbus Rec & Parks, Metro Parks, City of Columbus
- COSI, Columbus Symphony, GCAC, Short North Arts District, Shadowbox Live, Columbus Museum of Art
- Dublin Chamber, City of Westerville, City of Dublin, City of Delaware, City of Hilliard
- Columbus Clippers (MiLB), RunSignUp Ohio, OhioRaces.com

**RSS Feeds** (`sources/rssFeeds.ts`)
Local news and media sites.
- Columbus Dispatch, Columbus Alive, 614 Magazine, Patch Columbus/Delaware
- ThisWeekNews.com, Delaware Gazette, Columbus Monthly

**Experience Columbus** (`sources/experienceColumbus.ts`)
Custom Cheerio scraper for experiencecolumbus.com/events.

**Columbus Rec & Parks** (`sources/columbusRecParks.ts`)
Cheerio scraper for columbusrecparks.com (supplements ICS feed).

**Sports Schedules** (`sources/sportsSchedules.ts`)
- **Columbus Clippers** — MiLB Stats API (`statsapi.mlb.com`), team ID 455, sport ID 11. No API key required.
- **Columbus Blue Jackets** — NHL API (`api-web.nhle.com`), team abbreviation CBJ. No API key required.
- **Columbus Crew** — Cheerio scraper of columbuscrew.com/schedule
- **Ohio State Athletics** — Cheerio scraper of ohiostatebuckeyes.com/calendar

**Races** (`sources/races.ts`)
- RunSignUp.com — HTML scraper, 30-mile radius from Columbus
- Columbus Marathon — Direct homepage scrape
- OhioRaces.com — HTML scraper

**Venue List / Schema.org Scraper** (`sources/schemaOrgScraper.ts` + `sources/venueList.ts`)
The primary coverage-broadening approach. A curated list of 50+ Central Ohio venues is maintained in `venueList.ts`. For each venue, the scraper:
1. Fetches the events/calendar page
2. Extracts `<script type="application/ld+json">` tags and parses Event schema.org markup
3. Falls back to Cheerio HTML selectors if no structured data is found (handles Squarespace, WordPress/The Events Calendar, Wix, etc.)

Venue categories: farms & agritourism, music venues, arts & culture, community & neighborhoods, outdoor & recreation, food & drink, suburban city calendars.

Notable venues: Henmick Farm & Brewery, Lynd Fruit Farm, Timbuk Farms, Newport Music Hall, KEMBA Live!, The Bluestone, A&R Music Bar, CAPA Columbus, Palace Theatre, Columbus Museum of Art, Franklin Park Conservancy, Wexner Center for the Arts, Columbus Zoo, StepOut Columbus, North Market, Columbus Metro Parks, TrekOhio, Columbus Outdoor Pursuits, and 30+ more.

#### Removed Sources (from v1.1 PRD)

| Source | Reason Removed |
|---|---|
| Eventbrite API | Now requires a paid plan; free API tier discontinued |
| Facebook Events | Login wall blocks all public scraping reliably |

### 4.4 Crawl Technology Stack

| Tool | Use Case | Notes |
|---|---|---|
| node-ical | ICS/iCal feed parsing | Most reliable; use as first preference for any source that publishes feeds |
| rss-parser | RSS/Atom feeds | Local news and media sites |
| Axios + Cheerio | Static HTML pages | Default for most scraping; lightweight |
| Playwright | JS-rendered pages | Headless Chromium; use only when Cheerio fails due to JS rendering. **Note: on Render free tier, install without `--with-deps` flag** |
| MiLB Stats API | Columbus Clippers schedule | Free JSON API, no key required |
| NHL API | Blue Jackets schedule | Free JSON API, no key required |

### 4.5 Deduplication

Events discovered from multiple sources are fingerprinted via SHA-256 hash of: `normalized_title + ISO_date + normalized_location`. If a matching hash exists in the database, the existing record is updated to include the new source name in `additionalSources` rather than creating a duplicate. The hash is stored in `fingerprintHash` (unique index).

### 4.6 Failure Alerting

If a nightly crawl completes with zero events, or throws an unhandled top-level error, the system sends an alert email via Nodemailer + Gmail SMTP. No alert is sent on a successful crawl. Alert includes: timestamp, sources attempted vs. succeeded, error messages, and event count.

---

## 5. Data Model

### 5.1 Events Table

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| title | String | Event name |
| description | Text? | Full description (nullable) |
| date | DateTime | Event start date (stored as full ISO datetime in Postgres) |
| startTime | String? | "HH:MM" format; null if all-day |
| endTime | String? | "HH:MM" format; null if no end time |
| locationName | String | Venue or location name |
| address | String? | Street address |
| lat | Float? | Latitude, geocoded via Nominatim |
| lng | Float? | Longitude, geocoded via Nominatim |
| sourceUrl | String | Canonical source URL |
| sourceName | String | Human-readable source label |
| additionalSources | Json? | Array of `{sourceName: string}` for multi-source events |
| tags | String[] | Array of tag slugs assigned at ingest |
| fingerprintHash | String (unique) | SHA-256 dedup hash |
| relevanceScore | Float | Heuristic score for Top Picks ranking |
| crawledAt | DateTime | When first ingested (for "Recently Added" filter) |
| addedToCalendar | Boolean | Whether user has added to Google Calendar |
| calendarEventId | String? | Google Calendar event ID (for duplicate prevention) |
| archived | Boolean | True for events older than 6 months |

> **Important:** The `date` field is stored as a full ISO datetime by Prisma/PostgreSQL. When displaying dates on the frontend, always extract the date portion first: `const datePart = dateStr.split("T")[0]` before constructing a `new Date()`. Failing to do this causes "Invalid Date" on all event cards.

### 5.2 Users Table

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key (internal) |
| googleId | String (unique) | Google OAuth subject ID — **use this to identify the current user, not `id`** |
| email | String | User email address |
| name | String? | Display name |
| refreshToken | String? | AES-256-GCM encrypted Google OAuth refresh token |
| defaultReminderMinutes | Int | Default calendar reminder offset (default: 1440 = 1 day) |
| alertEmail | String? | Email for crawl failure notifications |
| createdAt | DateTime | Account creation timestamp |

### 5.3 CrawlLog Table

| Field | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| startedAt | DateTime | Crawl start time |
| completedAt | DateTime? | Crawl completion time |
| sourcesTotal | Int? | Number of sources attempted |
| sourcesSuccess | Int? | Number that returned ≥1 event without error |
| eventsFound | Int? | Total deduplicated events found |
| eventsNew | Int? | New events inserted this run |
| errors | String[] | Per-source error messages |
| success | Boolean | True if eventsFound > 0 |

---

## 6. Event Tagging System

Tags are assigned automatically at ingest time using a rule-based keyword matching engine (`crawler/src/tagging.ts`). Events can carry multiple tags.

### 6.1 Tag Taxonomy

| Tag slug | Label | Example trigger keywords |
|---|---|---|
| sporting-events | Sporting events | game, match, OSU, Buckeyes, Clippers, Crew, Blue Jackets, tournament |
| races-runs | Races & runs | 5K, 10K, half marathon, marathon, fun run, trail run, race, color run |
| festivals | Festivals | festival, fest, fair, expo, celebration, jubilee |
| parades | Parades | parade, procession, march, float, drill team |
| great-for-kids | Great for kids | family, kids, children, playground, youth, all ages, kid-friendly |
| live-music | Live music | concert, live music, band, performance, orchestra, symphony, jazz, open mic |
| food-drink | Food & drink | food truck, brewery, tasting, farmers market, wine, beer, culinary |
| arts-culture | Arts & culture | art, gallery, exhibit, museum, theatre, theater, film, screening, poetry |
| outdoors-nature | Outdoors & nature | hike, trail, nature, park, garden, kayak, paddle, bird, wildlife |
| community | Community | volunteer, cleanup, neighborhood, civic, town hall, association |
| education | Education | workshop, class, lecture, seminar, learning, skill, training |
| pet-friendly | Pet-friendly | dog, pet, leash, bark in the park, four-legged, canine |
| seasonal-holiday | Seasonal / holiday | Halloween, Christmas, Thanksgiving, Easter, Fourth of July, seasonal |
| fundraiser-charity | Fundraiser / charity | fundraiser, gala, charity, benefit, auction, nonprofit |
| free-admission | Free admission | free, no cost, free admission, complimentary, no charge |

### 6.2 Relevance Scoring (Top Picks)

| Signal | Weight | Rationale |
|---|---|---|
| Multi-source confirmation | +3.0 | Same event found across 2+ sources = higher legitimacy |
| Source credibility tier | +0.0 to +2.0 | Govt/parks (+2), established media (+1.5), community (+1), unknown (+0) |
| Has complete metadata | +1.0 | Has time, location, and description filled |
| Free admission tag | +0.5 | Slight boost for accessible events |
| Family/kids tag | +0.5 | Broad appeal signal |
| Far-future date penalty | -0.1 per week beyond 3 | Deprioritize events far out on home screen |

---

## 7. Frontend — Web Application

Built with Next.js 14 (App Router), TypeScript, Tailwind CSS. Authentication via NextAuth.js v5 beta.

### 7.1 Home Screen

**Top picks this week (hero section)**
- 3-column grid (desktop) / horizontal scroll (mobile) of 4–8 events
- Events scored by `relevanceScore`, filtered to next 7 days
- Each card: date label (blue), title, location with pin icon, tag chips
- Already-added events show green dot badge instead of checkbox

**All upcoming events (main list)**
- Default sort: chronological (soonest first)
- Default range: today through 6 months out
- Filter bar above list
- Checkboxes on each card for bulk selection
- Action bar appears at bottom when 1+ events selected

### 7.2 Filters

| Filter | Type | Behavior |
|---|---|---|
| Tags | Multi-select pills | Show events matching ANY selected tag (OR logic) |
| Date range | Date picker (from/to) | Default: today through 6 months |
| Recently added | Toggle pill | Shows events with crawledAt within last 7 days |
| Hide added | Toggle pill | Hides events already added to calendar |

### 7.3 Bulk Add to Calendar Flow

1. User selects one or more events via checkboxes
2. Action bar appears at bottom of list
3. User clicks "Add to Calendar"
4. Modal: list of selected events + reminder time selector
5. On confirm: Google Calendar API called per event; `calendarEventId` stored; event flagged `addedToCalendar = true`
6. Success toast shown; events now show "Added to calendar" badge

### 7.4 Settings Page

- Default reminder time: 1 hour, 1 day, 2 days, 1 week, custom (minutes)
- Alert email for crawl failure notifications
- "Trigger manual crawl" button (calls `POST /api/crawl/trigger`)

---

## 8. Google Calendar Integration

### 8.1 OAuth Scopes Required

- `openid`, `email`, `profile`
- `https://www.googleapis.com/auth/calendar.events` (write)

### 8.2 Calendar Event Format

| Google Calendar Field | Source |
|---|---|
| summary | Event title |
| description | Event description + "Source: [source_url]" |
| start.dateTime / start.date | Event date + startTime (or date-only if no time) |
| end.dateTime / end.date | endTime if available; else start + 2 hours |
| location | locationName + ", " + address |
| reminders.overrides | User's defaultReminderMinutes |

### 8.3 Reminder Options

1 hour before, 3 hours before, 1 day before, 2 days before, 1 week before, custom (minutes input).

---

## 9. Tech Stack

### As Deployed

| Layer | Technology | Hosting |
|---|---|---|
| Frontend + API Routes | Next.js 14.2 (App Router) | Vercel — free hobby tier |
| Authentication | NextAuth.js v5 beta (^5.0.0-beta.30) | Built into Next.js on Vercel |
| Database | PostgreSQL | Supabase — free tier |
| ORM | Prisma 5 | — |
| Web Scraping (static) | Axios + Cheerio | Crawler service on Render |
| Web Scraping (dynamic) | Playwright headless Chromium | Crawler service on Render |
| ICS/iCal Ingestion | node-ical | Crawler service on Render |
| RSS Ingestion | rss-parser | Crawler service on Render |
| Sports APIs | MiLB Stats API, NHL API | Free, no key required |
| Crawler Service | Node.js (Express) + ts-node | Render — free tier |
| Job Scheduler | Render Cron Job | Nightly 2:00 AM ET |
| Email Alerts | Nodemailer + Gmail SMTP | Free; Gmail App Password |
| Calendar API | Google Calendar API v3 | Free; via OAuth tokens |
| Geocoding | Nominatim (OpenStreetMap) | Free, no API key |

### 9.1 Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Vercel                           │
│  Next.js 14 App (frontend + API routes + NextAuth)      │
│  URL: https://go-out-already.vercel.app                 │
└──────────────────────────┬──────────────────────────────┘
                           │ reads/writes
                           ▼
┌─────────────────────────────────────────────────────────┐
│                       Supabase                          │
│  PostgreSQL (free tier)                                 │
│  Connection: pooler URL port 6543 with ?pgbouncer=true  │
└──────────────────────────▲──────────────────────────────┘
                           │ reads/writes
┌──────────────────────────┴──────────────────────────────┐
│                        Render                           │
│  Crawler Service (Node.js)                              │
│  URL: https://go-out-already.onrender.com               │
│  Cron: POST /run nightly at 2:00 AM ET                  │
└─────────────────────────────────────────────────────────┘
```

**Monthly cost: $0**

### 9.2 Key Dependency Versions

These specific versions are required — do not casually upgrade without testing:

| Package | Version | Why pinned |
|---|---|---|
| `next` | 14.2.x | Next.js 15 has breaking App Router changes |
| `next-auth` | ^5.0.0-beta.30 | v5 beta; breaking API vs v4 |
| `prisma` + `@prisma/client` | ^5.x | Prisma 7 introduced breaking schema changes (removed `url =` from datasource) |
| Node.js | 20.x | Next.js 14 incompatible with Node 22+; crawler ESM issues on Node 25 |

### 9.3 API Routes

| Method | Route | Description |
|---|---|---|
| GET | /api/events | Fetch events with filters: tags, dateFrom, dateTo, recentlyAdded, showAdded |
| GET | /api/events/top-picks | Top-scored events within next 7 days |
| POST | /api/calendar/add | Add event IDs to Google Calendar; body: `{ eventIds[], reminderMinutes }` |
| GET | /api/user/preferences | Fetch current user preferences |
| PUT | /api/user/preferences | Update user preferences |
| POST | /api/crawl/trigger | Manually trigger a crawl run |
| GET | /api/crawl/status | Status of last crawl |

---

## 10. Non-Functional Requirements

### 10.1 Performance
- Event list initial load: < 1.5 seconds
- Calendar add (single event): < 3 seconds
- Nightly crawl completion: < 45 minutes for full source list (50+ venues sequential)

### 10.2 Reliability
- Individual source failures must not abort the entire crawl; each source wrapped in `runSource()` try/catch
- Failed sources are logged; alert sent only if total events = 0 or top-level error
- Venue scraper runs sequentially with 400ms delay between sites (polite crawling, Render memory limits)

### 10.3 Data Retention
- Events older than 6 months are automatically archived (`archived = true`) at end of each crawl
- Calendar event IDs retained indefinitely for duplicate prevention

### 10.4 Security
- OAuth refresh tokens stored encrypted (AES-256-GCM) using `ENCRYPTION_KEY`
- API routes protected by NextAuth session check
- No sensitive data in URL parameters
- HTTPS enforced by Vercel and Render by default

---

## 11. Future Considerations

These are intentionally out of scope for v1 but worth tracking:

- **Multi-city support** — The venue list architecture supports this naturally (see Section 13)
- **Email digest** — Weekly summary of newly added events matching user's favorite tags
- **Tag preferences** — Pre-filter on load based on saved user favorites
- **Event hiding** — Dismiss/swipe events not of interest
- **Map view** — Geographic display of events with clustering
- **LLM-based tagging** — Replace keyword engine with a local LLM (Ollama) for richer categorization
- **Mobile PWA** — Progressive web app manifest for home screen installability
- **Multi-user** — Family members sharing one instance with individual calendar accounts
- **Meetup.com scraper** — Community group events; requires careful scraping of public event pages

---

## 12. Setup & Deployment Guide

This section documents the exact steps to stand up a fresh instance, incorporating every issue discovered during the initial deployment. Follow this precisely to avoid the pitfalls.

**Estimated time: 2–3 hours for a first-time deployment.**

---

### Step 1: Prerequisites

Install the following before starting:

```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.zshrc   # or ~/.bashrc

# Install and use Node 20 — REQUIRED. Node 22+ breaks Next.js 14.
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version   # must show v20.x.x
```

---

### Step 2: Clone and Install

```bash
git clone https://github.com/AEngineer85/go-out-already.git
cd go-out-already

# Install Next.js app dependencies
npm install

# Install crawler dependencies
cd crawler && npm install && cd ..
```

---

### Step 3: Generate Secret Keys

Run these commands and save the output — you'll need them for environment variables:

```bash
# NEXTAUTH_SECRET — any random string, min 32 chars
openssl rand -base64 32

# ENCRYPTION_KEY — must be exactly 64 hex characters (32 bytes)
openssl rand -hex 32
```

---

### Step 4: Set Up Supabase (Database)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (choose a region close to you)
3. Wait for the project to finish provisioning (~2 minutes)
4. Go to **Project Settings → Database**
5. Scroll down to **Connection Pooling** section
6. Copy the **Connection string** (URI format) — it will look like:
   ```
   postgresql://postgres.xxxx:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
7. **Critical:** Add `?pgbouncer=true` to the end of this URL:
   ```
   postgresql://postgres.xxxx:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

> **Why pooler + pgbouncer?** Vercel's serverless functions open new DB connections on every request. Without connection pooling, you'll hit Supabase's connection limit quickly. Without `?pgbouncer=true`, Prisma tries to use prepared statements which conflict with PgBouncer's transaction-mode pooling. Both settings are required.

---

### Step 5: Set Up Google Cloud Project (OAuth + Calendar API)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (e.g., "Go Out Already")
3. Enable APIs:
   - Search for and enable **Google Calendar API**
   - Search for and enable **People API** (needed for profile scope)
4. Go to **APIs & Services → OAuth consent screen**
   - Choose **External**
   - Fill in app name ("Go Out Already"), user support email, developer email
   - Add scopes: `email`, `profile`, `openid`, `https://www.googleapis.com/auth/calendar.events`
   - Under **Test users**: click "Add Users" and add your Google account email
   - Publishing status: leave as **Testing** (you don't need to publish for personal use)
5. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Name: "Go Out Already Web"
   - Authorized redirect URIs — add **both**:
     ```
     http://localhost:3000/api/auth/callback/google
     https://go-out-already.vercel.app/api/auth/callback/google
     ```
   - Click **Create**
6. Copy the **Client ID** and **Client Secret**

> **Important:** Add your email as a test user even if you're also the app owner. Without this, Google will show "Access Denied" after the OAuth flow. Do not click "Publish App" — testing mode is sufficient for personal use.

---

### Step 6: Set Up Gmail App Password (Email Alerts)

1. Go to your Google Account settings: [myaccount.google.com](https://myaccount.google.com)
2. Go to **Security**
3. Enable **2-Step Verification** if not already on
4. After enabling 2FA, go back to **Security** — scroll down and look for **"App passwords"** (it appears under the 2-Step Verification section, or search for "App passwords" in the search bar)
5. Create an app password:
   - App: "Mail" (or custom name "Go Out Already")
   - Device: "Other"
6. Copy the 16-character password (shown once — save it)

> **Note:** App Passwords only appears in your Google Account after 2FA is enabled. It is NOT inside the 2-Step Verification settings page — look for it as a separate item on the Security page.

---

### Step 7: Create Environment Files

**Root app (`/.env`):**

```env
# Database — use the POOLER URL with ?pgbouncer=true (port 6543)
DATABASE_URL="postgresql://postgres.xxxx:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="[output from openssl rand -base64 32]"

# Google OAuth
GOOGLE_CLIENT_ID="[your client ID].apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="[your client secret]"

# Encryption key for refresh tokens — must be 64 hex chars (32 bytes)
ENCRYPTION_KEY="[output from openssl rand -hex 32]"

# Email alerts (Gmail SMTP)
ALERT_EMAIL_FROM="youremail@gmail.com"
ALERT_EMAIL_APP_PASSWORD="[16-char app password, no spaces]"
```

**Crawler (`/crawler/.env`):**

```env
# Same DATABASE_URL as above — must use pooler + pgbouncer
DATABASE_URL="postgresql://postgres.xxxx:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Used to authenticate crawl trigger requests from Vercel
CRAWL_SECRET="[any random string]"
```

> **Do not** put quotes around values unless the value contains spaces. The shown quotes are just for clarity in this document.

---

### Step 8: Initialize the Database

```bash
# From the project root
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Generate Prisma client for the crawler too
cd crawler && npx prisma generate && cd ..
```

---

### Step 9: Run Locally

```bash
# Terminal 1 — Next.js app
npm run dev
# Opens at http://localhost:3000

# Terminal 2 — Run crawler once manually to test
cd crawler && npm run crawl
```

Visit `http://localhost:3000`, click Sign In, and authenticate with your Google account. If you see "Access Denied," check that your email is added as a test user in Google Cloud Console (Step 5).

---

### Step 10: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New Project** → import `AEngineer85/go-out-already`
3. Framework preset: **Next.js** (auto-detected)
4. Add all environment variables from your `/.env` file, **but change**:
   ```
   NEXTAUTH_URL = https://go-out-already.vercel.app
   ```
5. Click **Deploy**

**If the build fails:**
- "Cannot find module prisma" → The `build` script in `package.json` must be `prisma generate && next build` (already set in repo)
- ESLint errors → Check `src/` files for unused imports or variables; fix and re-push
- Crawler TypeScript errors → Confirm `"crawler"` is in the `exclude` array in root `tsconfig.json`

---

### Step 11: Deploy Crawler to Render

1. Go to [render.com](https://render.com) and sign in with GitHub
2. Click **New → Web Service**
3. Connect repository: `AEngineer85/go-out-already`
4. Configure:
   - **Name:** go-out-already-crawler
   - **Root Directory:** `crawler`
   - **Runtime:** Node
   - **Build Command:**
     ```
     npm install && npx playwright install chromium && npx prisma generate
     ```
     > **Note:** Do NOT add `--with-deps` to the playwright install command. Render's free tier runs without root access and this flag will fail with "su: Authentication failure."
   - **Start Command:**
     ```
     npm start
     ```
   - **Instance Type:** Free

5. Add environment variables:
   ```
   DATABASE_URL = [pooler URL with ?pgbouncer=true]
   CRAWL_SECRET = [same value as in Vercel env vars]
   ALERT_EMAIL_FROM = youremail@gmail.com
   ALERT_EMAIL_APP_PASSWORD = [app password]
   NODE_ENV = production
   ```

6. Click **Create Web Service**

**If the deploy fails:**
- `ERR_REQUIRE_CYCLE_MODULE` → Confirm `crawler/tsconfig.json` has `"module": "commonjs"` (not ESM)
- `HTMLAnchorElement not found` → Use `(element as { href: string }).href` instead of DOM type casting
- `Prisma client not initialized` → Confirm `npx prisma generate` is in the build command AND `crawler/prisma/schema.prisma` exists
- `Can't reach database at port 5432` → You're using the direct connection URL. Switch to the pooler URL on port 6543 with `?pgbouncer=true`

---

### Step 12: Set Up Nightly Cron on Render

1. In Render dashboard, go to your crawler service
2. Click **Cron Jobs** (in the left sidebar) → **New Cron Job**
3. Configure:
   - **Name:** nightly-crawl
   - **Schedule:** `0 7 * * *` (7:00 AM UTC = 2:00 AM ET; adjust for daylight saving)
   - **Command:** `curl -X POST https://go-out-already.onrender.com/run -H "x-crawl-secret: [your CRAWL_SECRET]"`

Alternatively, trigger manually from the Settings page in the app.

---

### Step 13: Verify Everything Works

1. Visit `https://go-out-already.vercel.app`
2. Sign in with Google
3. Go to **Settings → Trigger Manual Crawl**
4. Wait 2–5 minutes, then refresh the home page
5. Events should appear. Check Render logs if nothing shows up.

**Common post-deploy issues:**

| Symptom | Cause | Fix |
|---|---|---|
| "Invalid Date" on all event cards | Date not split before parsing | `dateStr.split("T")[0]` in EventCard (already fixed in repo) |
| Sign in fails with "Access Denied" | Email not added as test user | Add email to Google Cloud Console → OAuth consent → Test users |
| Sign in works but app shows no user | Session callback wrong | `session.user.id` must come from `token.sub`, not a DB lookup (already fixed) |
| Calendar add returns 401 | DB query using `id` instead of `googleId` | All user queries must use `where: { googleId: session.user.id }` (already fixed) |
| Crawler returns 401 on trigger | Missing or wrong CRAWL_SECRET | Ensure env var matches on both Vercel and Render |

---

## 13. Adapting for a New City

The architecture is designed to make adding a new city straightforward. All geographic assumptions are isolated to a few files.

### What to Change

**1. `crawler/sources/venueList.ts`**

Replace (or add to) the `VENUE_LIST` array with venues for the new city. Each entry needs:
```typescript
{ url: "https://venue-website.com/events", name: "Venue Name", category: "music" }
```
Categories: `farm`, `music`, `arts`, `community`, `outdoors`, `food`

The `schemaOrgScraper.ts` handles the rest automatically — no other scraper changes needed for venues that publish schema.org markup.

**2. `crawler/sources/icsFeeds.ts`**

Replace the ICS feed URLs with ones for the new city. Many government and parks sites publish ICS feeds — check `[city-website.gov]/events/?ical=1` or look for a calendar export link.

**3. `crawler/sources/sportsSchedules.ts`**

Update team IDs and venue details for local professional/minor league teams:
- MiLB: Change `teamId: 455` to the new city's team ID (find at statsapi.mlb.com)
- NHL: Change `CBJ` to the new city's team abbreviation
- Add/remove scrapers for local teams as appropriate

**4. `crawler/sources/races.ts`**

Update location parameters in RunSignUp and OhioRaces queries:
```typescript
distance_from: "Columbus, OH"  →  distance_from: "New City, STATE"
```

**5. `crawler/sources/rssFeeds.ts`**

Replace with RSS feeds from local newspapers and community sites.

**6. `crawler/sources/experienceColumbus.ts`**

If the new city has a convention & visitors bureau with a public events page, create a similar custom scraper.

**7. `src/app/page.tsx` and UI copy**

Update the tagline and any hardcoded city references.

### What You Don't Need to Change

- Database schema — fully region-agnostic
- Auth system — no changes needed
- Tagging system — keyword-based, works for any city
- Relevance scoring — no changes needed
- Frontend components — no changes needed
- Deployment infrastructure — Vercel + Supabase + Render setup is identical

### Multi-City Considerations (Future)

If running multiple cities from one codebase, consider:
- Adding a `city` or `region` field to the `Event` model
- Parameterizing the venue list selection by environment variable
- Running separate crawler instances per city (separate Render services)
- Filtering the frontend by city if needed

---

## 14. Resolved Questions & Implementation Notes

These were open questions in v1.1 PRD, now answered:

| Question | Resolution |
|---|---|
| Playwright on Railway: memory/CPU limits? | **Switched to Render.** Playwright works on Render free tier. Install without `--with-deps` (no root). Cheerio-first approach reduces Playwright usage significantly. |
| Nominatim usage limits? | Geocoding is called only for events with addresses not containing the city name. Nominatim's 1 req/sec limit is respected by the crawler's sequential execution. |
| Facebook Events scraping? | **Dropped.** Login walls make this unreliable. Not worth the fragility. |
| Eventbrite free API? | **Dropped.** Eventbrite discontinued the free tier for their discovery API. All Eventbrite integration removed. |
| ICS feed discovery? | Done. ~20 ICS feeds implemented. Most government/parks sites support `?ical=1` appended to their events URL. |
| Google Calendar quota? | Confirmed: 1M requests/day, well above single-user needs. |
| Railway vs. other hosting? | **Railway replaced by Supabase (DB) + Render (crawler).** Railway's free tier was removed; Supabase + Render are both genuinely free with no credit card required for the usage levels here. |
| Prisma version? | **Use Prisma 5, not 7.** Prisma 7 removed the `url = env("DATABASE_URL")` syntax from the datasource block, breaking the standard setup. Prisma 5 is stable and fully featured for this project. |
| Node version? | **Use Node 20.** Node 22+ causes compatibility issues with Next.js 14. Node 25 broke the crawler with ESM cycle errors. |
| Crawler TypeScript compilation? | **Use CommonJS, not ESM.** The crawler `tsconfig.json` must have `"module": "commonjs"`. ESM mode on Node 22 causes `ERR_REQUIRE_CYCLE_MODULE`. |

---

*Version 1.2 — Updated April 2026 to reflect deployed implementation.*
*Original PRD v1.1 authored April 2026.*
