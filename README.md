# NagarNetra — City's Eye 👁️

> AI-powered civic grievance & infrastructure triage.
> **Report in your language in 10 seconds; AI makes sure the right office sees it — and proves when it's actually fixed.**

Citizens report potholes, leaks, garbage, broken streetlights and more by **photo, voice note (Odia / Hindi / English) or text**. AI transcribes, classifies and scores severity, **merges duplicates**, **routes** to the responsible department, and **verifies the repair** by comparing before/after photos. Everything is visible on a public map and a department scorecard.

Built for the IDEA//FORGE Hackathon (Track 1 — Civic Pulse). Full product & technical spec: [`docs/SPECS.md`](docs/SPECS.md).

---

## Features

| Area             | What it does                                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| Report wizard    | Camera/gallery photo (compressed, EXIF stripped), 60 s voice note, optional text, GPS with draggable pin          |
| AI triage        | Gemini Flash (primary) → Groq (fallback): STT, category, severity 1–5, bilingual summaries, spam detection        |
| Deduplication    | PostGIS radius search + AI same-issue check; "You are report #N"                                                  |
| Routing          | Category → department, SLA deadlines, reverse-geocoded locality, auto complaint letter, optional Telegram alert   |
| Fix verification | Officer must upload an after-photo within 100 m; AI accepts (`resolved`) or rejects (`closure_rejected`) publicly |
| Transparency     | Live clustered map + heatmap, stats dashboard, department scorecard, public timeline per incident                 |
| Officer console  | Priority-sorted queue, full report drawer, status actions, admin overrides, department settings                   |
| i18n & PWA       | English / ଓଡ଼ିଆ / हिंदी UI, installable PWA with offline fallback                                                    |

## Tech stack

Next.js 15 (App Router, TypeScript) · Tailwind CSS 4 · Supabase (Postgres + PostGIS, Storage, Auth, Realtime) · Gemini / Groq · Leaflet + OSM · Recharts · Zod · Vitest. Runs entirely on free tiers.

## Project structure

```
app/                     Next.js routes
  api/                   Route handlers (report, incidents, stats, admin, cron)
  admin/                 Officer console (login, queue, departments)
  report/ map/ stats/    Citizen & public pages
  track/ incident/       Incident pages (by ticket code / id)
components/
  admin/ incident/ layout/ map/ report/ stats/ ui/
lib/
  ai/                    Provider abstraction, Gemini, Groq, prompts, Zod schemas
  env/                   client.ts (NEXT_PUBLIC_*) and server.ts (secrets) — validated
  i18n/                  en / or / hi dictionaries + provider
  supabase/              browser, server (cookie) and service-role clients
  triage.ts resolve.ts   Report pipeline and fix verification
  dedupe.ts priority.ts status.ts geo.ts ticket.ts …  Pure, unit-tested domain logic
supabase/                schema.sql → policies.sql → seed.sql
scripts/seed-demo.ts     Creates demo officer/admin accounts
tests/unit/              Vitest suites
docs/SPECS.md            Product & technical specification
```

## Getting started

### 1. Prerequisites

- Node.js ≥ 20.9 (see `.nvmrc`)
- A free [Supabase](https://supabase.com) project (region: Mumbai `ap-south-1` recommended)
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini). Optional: a [Groq](https://console.groq.com) key for fallback.

### 2. Database

In the Supabase **SQL editor**, run in order:

1. `supabase/schema.sql` — tables, PostGIS, functions, views, storage buckets, Realtime
2. `supabase/policies.sql` — Row Level Security
3. `supabase/seed.sql` — 12 departments + 40 demo incidents

Then in **Authentication → Providers**, make sure Email is enabled.

### 3. Environment

```bash
cp .env.example .env.local
```

Fill in the values. Variables are split by exposure:

| Group      | Variables                                                                                                                | Where it's read                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| **Public** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_MAP_CENTER`             | `lib/env/client.ts`                 |
| **Server** | `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_*`, `GROQ_*`, `CITY_*`, `NOMINATIM_USER_AGENT`, `CRON_SECRET`, `TELEGRAM_BOT_TOKEN` | `lib/env/server.ts` (`server-only`) |

Both are validated with Zod at startup. `lib/env/server.ts` imports `server-only`, so a secret can never be bundled into browser code by accident. `.env.test` holds harmless dummy values for the test suite.

> ⚠️ The Gemini free tier may use submitted data for training — use demo data only.

### 4. Install, seed, run

```bash
npm install
npm run seed:demo      # creates roads@ / water@ / admin@nagarnetra.demo and prints the password
npm run dev            # http://localhost:3000
```

Officer console: `/admin/login`.

## Scripts

| Command                   | Purpose                                           |
| ------------------------- | ------------------------------------------------- |
| `npm run dev`             | Development server                                |
| `npm run build` / `start` | Production build / serve                          |
| `npm run lint`            | ESLint (Next.js core-web-vitals + TypeScript)     |
| `npm run typecheck`       | `tsc --noEmit`                                    |
| `npm test`                | Vitest unit tests                                 |
| `npm run format`          | Prettier                                          |
| `npm run check`           | Format check + lint + typecheck + tests (CI gate) |
| `npm run seed:demo`       | Create demo staff accounts                        |

## Deployment (Vercel)

1. Push to GitHub and **Import Project** in Vercel (framework: Next.js).
2. Add every variable from `.env.example` under **Settings → Environment Variables** (Production + Preview). Set `NEXT_PUBLIC_APP_URL` to your Vercel URL and generate a random `CRON_SECRET`.
3. Deploy. `vercel.json` schedules `/api/cron/recompute` daily — it recomputes priorities, prunes rate-limit rows and keeps the free Supabase project awake.
4. Smoke-test on a phone: report → map → admin resolve → verify.

## API

All routes return JSON; errors are `{ "error": { "code", "message" } }`.

| Method & path                           | Access          | Purpose                                   |
| --------------------------------------- | --------------- | ----------------------------------------- |
| `POST /api/upload-url`                  | public / staff  | Signed direct-to-storage upload URLs      |
| `POST /api/report`                      | public          | Submit a report (triage, dedupe, routing) |
| `GET /api/incidents`                    | public          | Filterable incident list (no PII)         |
| `GET /api/incidents/:idOrTicket`        | public          | Incident detail, timeline, before/after   |
| `POST /api/incidents/:id/reopen`        | public + ticket | Reopen within 7 days of resolution        |
| `GET /api/stats`                        | public          | KPIs, scorecard, 30-day trend             |
| `GET /api/admin/incidents`              | staff           | Priority queue                            |
| `GET·PATCH /api/admin/incidents/:id`    | staff           | Detail with reports; status / overrides   |
| `POST /api/admin/incidents/:id/resolve` | staff           | After-photo → AI verification             |
| `GET·PATCH /api/admin/departments`      | staff / admin   | Department settings                       |
| `GET /api/cron/recompute`               | cron secret     | Daily maintenance                         |

Rate limits (per IP, Postgres-backed): 5 reports / 10 min, 15 uploads / 10 min, 60 reads / min.

## Security & privacy

- The browser only has the anon key; every write goes through API routes using the service-role key.
- RLS is enabled on all tables; reporter name/phone live only in `reports` and never appear in public endpoints or views.
- Storage buckets are private; media is served through 1-hour signed URLs. Upload paths are validated server-side.
- Images are re-encoded client-side, which strips EXIF/GPS metadata.

## Testing

```bash
npm test
```

Unit tests cover priority scoring, SLA, severity adjustment, dedupe decisions, bbox/distance, ticket codes, state-machine transitions, fix-acceptance rule, AI schema parsing, and i18n dictionary completeness. The AI eval set, Playwright E2E and load tests from the spec (§22) are not yet included.

## License

[MIT](LICENSE)
