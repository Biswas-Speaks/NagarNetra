# NagarNetra — Product & Technical Specification

> **AI-Powered Civic Grievance & Infrastructure Triage System**
> IDEA//FORGE Online Hackathon · Track 1 — Civic Pulse, Digital Governance & Public Information · Problem 2
> Version 1.0 (MVP) · Author: Biswajit Shial · Date: 22 Nov 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Non-Goals](#3-goals--non-goals)
4. [Users & Personas](#4-users--personas)
5. [User Stories](#5-user-stories)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [System Architecture](#8-system-architecture)
9. [Technology Stack (Zero-Cost)](#9-technology-stack-zero-cost)
10. [Data Model](#10-data-model)
11. [Incident Lifecycle (State Machine)](#11-incident-lifecycle-state-machine)
12. [AI Pipeline Specification](#12-ai-pipeline-specification)
13. [Duplicate Detection Algorithm](#13-duplicate-detection-algorithm)
14. [Priority Score](#14-priority-score)
15. [Category → Department Routing](#15-category--department-routing)
16. [API Specification](#16-api-specification)
17. [Frontend Pages & UI Spec](#17-frontend-pages--ui-spec)
18. [Security & Access Control](#18-security--access-control)
19. [Project Structure](#19-project-structure)
20. [Environment Variables](#20-environment-variables)
21. [Deployment Guide (Vercel + Supabase)](#21-deployment-guide-vercel--supabase)
22. [Testing Plan](#22-testing-plan)
23. [Seed Data](#23-seed-data)
24. [Demo Script](#24-demo-script)
25. [Build Timeline](#25-build-timeline)
26. [Risks & Mitigations](#26-risks--mitigations)
27. [Production Roadmap (Paid)](#27-production-roadmap-paid)
28. [Success Metrics](#28-success-metrics)
29. [Glossary](#29-glossary)

---

## 1. Overview

**NagarNetra** ("City's Eye") lets any citizen report a civic problem — pothole, water leak, garbage dump, broken streetlight, open drain, pollution — by **photo, video or voice note in Odia, Hindi or English**. AI then:

- understands the report (vision + speech),
- classifies it and **scores its severity**,
- **merges duplicates** of the same problem,
- **routes** it to the responsible department,
- **verifies the fix** by comparing "before" and "after" photos,
- and publishes everything on a **transparent public dashboard**.

**One-line pitch:** *"Report in your language in 10 seconds; AI makes sure the right office sees it — and proves when it's actually fixed."*

---

## 2. Problem Statement

| Pain | Who feels it | Today |
|---|---|---|
| Don't know which department owns the problem | Citizens | Complaints bounce between agencies, or are never filed |
| Forms are English-only, text-heavy | Elderly, low-literacy, rural-migrant citizens | Excluded from the system |
| Hundreds of duplicate complaints for one pothole | Department officers | No way to prioritise; real emergencies drown |
| Tickets closed without actual repair | Citizens | Trust collapses; people stop reporting |
| No public visibility of performance | Citizens, media, city leadership | No accountability |

---

## 3. Goals & Non-Goals

### 3.1 MVP Goals
- G1. Citizen can submit a report in **≤ 30 seconds**, without typing, in Odia/Hindi/English.
- G2. AI produces category, severity (1–5), department and bilingual summary in **≤ 10 seconds**.
- G3. Reports of the same issue within ~50 m are **merged automatically**.
- G4. Authority can resolve an incident only by uploading an after-photo that the **AI verifies**.
- G5. Public map + department scorecard are accessible **without login**.
- G6. Total running cost: **₹0** (free tiers only).
- G7. Deployed publicly on **Vercel** with a shareable URL.

### 3.2 Non-Goals (MVP)
- Real integration with government grievance portals (CPGRAMS, state portals).
- WhatsApp/SMS intake (planned for production).
- Native Android/iOS apps (PWA covers this).
- Video analysis beyond extracting a key frame (stretch).
- Payments, Aadhaar/DigiLocker verification.

---

## 4. Users & Personas

| Persona | Description | Needs |
|---|---|---|
| **Citizen — "Sabita"** (52, homemaker, Odia speaker) | Smartphone, WhatsApp-level comfort, doesn't type English | Big buttons, voice input, Odia UI, ticket status |
| **Citizen — "Rohan"** (24, student) | Tech-savvy, wants quick reporting and proof of action | Fast flow, upvote existing issues, share link |
| **Department Officer — "Er. Das"** (BMC Roads) | Gets complaints from many channels | Prioritised queue, location, photos, no duplicates |
| **City Admin / Command Centre** | Oversees all departments | Heatmaps, SLA breaches, department performance |
| **Public / Media / Judges** | Want transparency | Public dashboard, resolution proof |

---

## 5. User Stories

### Citizen
- **US-1** As a citizen, I can take a photo and record a voice note so I can report without typing.
- **US-2** As a citizen, my location is captured automatically so I don't need to type an address.
- **US-3** As a citizen, I get a ticket ID and link so I can track my complaint.
- **US-4** As a citizen, if someone already reported the same issue, my report adds weight ("+1") instead of creating noise.
- **US-5** As a citizen, I can view the status timeline and the after-photo once fixed.
- **US-6** As a citizen, I can switch the UI to Odia, Hindi or English.

### Officer
- **US-7** As an officer, I see only my department's incidents, sorted by priority.
- **US-8** As an officer, I can mark an incident *In Progress* and add a note.
- **US-9** As an officer, I resolve an incident by uploading an after-photo.
- **US-10** As an officer, I'm told immediately if the AI thinks the fix is incomplete.

### Admin / Public
- **US-11** As anyone, I can see all incidents on a map with severity colours.
- **US-12** As anyone, I can see each department's average resolution time and pending count.
- **US-13** As an admin, I can override AI category/department/severity.

---

## 6. Functional Requirements

### FR-1 Report Intake
| ID | Requirement | Priority |
|---|---|---|
| FR-1.1 | Capture photo via device camera or gallery (JPEG/PNG/WebP/HEIC) | Must |
| FR-1.2 | Compress image client-side to ≤ 1280 px long edge, ≤ 500 KB | Must |
| FR-1.3 | Record voice note in browser (MediaRecorder, WebM/Opus), max 60 s | Must |
| FR-1.4 | Optional free-text description (max 500 chars) | Must |
| FR-1.5 | Auto-capture GPS (lat/lng/accuracy); allow manual pin drop on map if denied or accuracy > 100 m | Must |
| FR-1.6 | At least **one** of photo / voice / text is required; photo strongly encouraged | Must |
| FR-1.7 | Optional name + phone (for updates); anonymous reporting allowed | Should |
| FR-1.8 | Video upload (≤ 15 s); first frame extracted client-side and analysed as photo | Could |
| FR-1.9 | Upload files **directly to Supabase Storage** from browser (signed upload URL) | Must |

### FR-2 AI Triage
| ID | Requirement | Priority |
|---|---|---|
| FR-2.1 | Transcribe voice note; detect language (or / hi / en) | Must |
| FR-2.2 | Translate transcript to English for processing | Must |
| FR-2.3 | Classify into one of the fixed categories (§15) | Must |
| FR-2.4 | Score severity 1–5 using rubric (§12.4) with a one-line reason | Must |
| FR-2.5 | Generate `summary_en` (≤ 25 words) and `summary_or` (Odia) | Must |
| FR-2.6 | Detect invalid/spam/irrelevant images (selfie, meme, blank) → flag `is_valid=false` | Must |
| FR-2.7 | Detect hazards: `risk_to_life`, `near_sensitive_site` hints | Should |
| FR-2.8 | Return strict JSON validated with Zod; retry once on parse failure | Must |
| FR-2.9 | Fallback provider (Groq) if primary fails or rate-limited | Should |

### FR-3 Deduplication & Incident Management
| ID | Requirement | Priority |
|---|---|---|
| FR-3.1 | Find open incidents of same category within 50 m (PostGIS) | Must |
| FR-3.2 | If candidate found, optionally confirm with AI image comparison | Should |
| FR-3.3 | Merge → attach report, increment `report_count`, recompute priority | Must |
| FR-3.4 | Otherwise create new incident | Must |
| FR-3.5 | Citizen sees "You're report #N for this issue" | Must |

### FR-4 Routing & Notification
| ID | Requirement | Priority |
|---|---|---|
| FR-4.1 | Map category → department via `departments` table | Must |
| FR-4.2 | Reverse-geocode to locality/ward name (Nominatim), cached | Must |
| FR-4.3 | Auto-generate formal complaint text (English) for the department | Should |
| FR-4.4 | Telegram notification to department group on new high-severity (≥ 4) incident | Could |

### FR-5 Resolution & Verification
| ID | Requirement | Priority |
|---|---|---|
| FR-5.1 | Officer changes status: Open → Acknowledged → In Progress | Must |
| FR-5.2 | "Resolve" requires an after-photo, taken within 100 m of the incident location (GPS check) | Must |
| FR-5.3 | AI compares before vs after → `{fixed, confidence, reason}` | Must |
| FR-5.4 | `fixed=true & confidence ≥ 0.7` → RESOLVED; else → CLOSURE_REJECTED (visible publicly) | Must |
| FR-5.5 | Admin can manually override with mandatory note (logged) | Should |
| FR-5.6 | Citizen can "Reopen" within 7 days with a new photo | Could |

### FR-6 Public Transparency
| ID | Requirement | Priority |
|---|---|---|
| FR-6.1 | Public map with clustered pins, colour by severity, filter by category/status/date | Must |
| FR-6.2 | Department scorecard: total, open, resolved, avg resolution hours, rejected closures | Must |
| FR-6.3 | Incident public page with before/after photos and status timeline | Must |
| FR-6.4 | Live updates (Supabase Realtime) | Should |
| FR-6.5 | Hide reporter personal info on all public views | Must |

### FR-7 Localisation
| ID | Requirement | Priority |
|---|---|---|
| FR-7.1 | UI strings in English, Odia (ଓଡ଼ିଆ), Hindi via JSON dictionaries | Must |
| FR-7.2 | Language auto-select from browser; toggle in header; persisted in localStorage | Must |
| FR-7.3 | Odia-capable font (Noto Sans Oriya) | Must |

---

## 7. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Performance | Report page LCP < 2.5 s on 4G; AI triage p95 < 10 s |
| Availability | Best-effort (free tier); graceful error + retry UI |
| Scalability (MVP) | ~500 reports/day within free-tier limits |
| Mobile-first | Works on 360 px wide screens; PWA installable |
| Accessibility | Large tap targets (≥ 48 px), icon + text labels, high contrast, voice-first |
| Privacy | Reporter phone/name never public; EXIF stripped from images before upload |
| Security | Row Level Security on all tables; service key only server-side |
| Cost | ₹0 for MVP |
| Observability | Vercel logs + `ai_logs` table storing model, latency, tokens, errors |

---

## 8. System Architecture

```
┌──────────────────────────── Citizen / Officer / Public (Browser, PWA) ─────────────────────────────┐
│  Next.js App (React, Tailwind)                                                                      │
│   /report  /track/[id]  /map  /stats  /incident/[id]  /admin                                       │
└───────┬───────────────────────────────┬─────────────────────────────────────┬───────────────────────┘
        │ 1. signed upload URL           │ 3. POST /api/report                 │ Realtime subscribe
        ▼                                ▼                                     ▼
┌───────────────────┐        ┌──────────────────────────────┐       ┌───────────────────────────────┐
│ Supabase Storage  │◄──2.───│  Vercel Serverless Functions │──────►│ Supabase Postgres + PostGIS    │
│ (photos, audio)   │ upload │  /api/*  (Node runtime)      │       │ incidents, reports, depts, log │
└───────────────────┘        └──────┬───────────┬───────────┘       └───────────────────────────────┘
                                    │           │
                     ┌──────────────┘           └───────────────┐
                     ▼                                          ▼
          ┌─────────────────────┐                   ┌─────────────────────────┐
          │ Gemini Flash (free) │  primary          │ Groq (free)             │  fallback
          │ vision, audio, text │                   │ Whisper STT, Llama vis. │
          └─────────────────────┘                   └─────────────────────────┘
                     │
          ┌─────────────────────┐   ┌───────────────────────┐
          │ Nominatim (OSM)     │   │ Telegram Bot (opt.)   │
          │ reverse geocode     │   │ dept notifications    │
          └─────────────────────┘   └───────────────────────┘
```

### 8.1 Report Processing Sequence

```
Browser                     /api/upload-url    Storage     /api/report        Gemini     DB
  │ request signed URLs ───────►│                                                      
  │◄──────── urls ──────────────│                                                      
  │ PUT photo, audio ─────────────────────────►│                                       
  │ POST {photo_path, audio_path, lat, lng, text, lang} ─────►│                       
  │                                                          │ fetch files (signed)    
  │                                                          │── transcribe audio ──►│
  │                                                          │── triage (img+text) ─►│
  │                                                          │◄──── JSON ────────────│
  │                                                          │ reverse geocode (cache)
  │                                                          │ find_duplicate() ─────────────►│
  │                                                          │ insert/merge ────────────────►│
  │◄──── {ticket_id, incident_id, merged, report_number, summary} ──│                  
```

---

## 9. Technology Stack (Zero-Cost)

| Layer | Choice | Free-tier notes |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | — |
| Styling | **Tailwind CSS** + shadcn/ui | — |
| Hosting | **Vercel Hobby** | Non-commercial use; ~4.5 MB request body limit → upload files directly to storage |
| Database | **Supabase (Postgres + PostGIS)** | Free project pauses after ~7 days inactivity |
| Storage | **Supabase Storage** | Buckets: `report-media` (public-read via signed URLs), `resolution-media` |
| Auth | **Supabase Auth** (email + password) | Officers/admins only; citizens anonymous |
| Realtime | **Supabase Realtime** | Live map updates |
| AI — primary | **Google Gemini Flash** (AI Studio key) | Free tier: rate-limited, no card; free-tier data may be used by Google → demo data only |
| AI — fallback | **Groq** (`whisper-large-v3-turbo`, Llama vision) | Free, no card, rate-limited |
| Maps | **Leaflet + react-leaflet + OSM tiles** + `leaflet.markercluster` | Respect OSM tile usage policy |
| Geocoding | **Nominatim** | ≤ 1 req/s, custom User-Agent, cache results |
| Validation | **Zod** | — |
| Charts | **Recharts** | — |
| Image compression | **browser-image-compression** | Also strips EXIF |
| i18n | Lightweight JSON dictionaries + React context | — |
| Notifications | **Telegram Bot API** | Free |
| Repo / CI | **GitHub** → Vercel auto-deploy | — |

> Model IDs change frequently. Always copy exact model names from Google AI Studio / Groq console and keep them in env vars (`GEMINI_MODEL`, `GROQ_STT_MODEL`, `GROQ_VISION_MODEL`).

---

## 10. Data Model

### 10.1 ER Overview

```
departments 1───* incidents 1───* reports
                     │
                     ├──* status_log
                     └──* resolutions
profiles (officers/admins) *───1 departments
geocode_cache, ai_logs (standalone)
```

### 10.2 SQL Schema (run in Supabase SQL editor)

```sql
-- Extensions
create extension if not exists postgis;
create extension if not exists pgcrypto;

-- Enums
create type incident_category as enum (
  'pothole_road_damage', 'water_leak_supply', 'sewage_drainage',
  'garbage_waste', 'streetlight', 'electricity_hazard',
  'air_pollution', 'water_pollution', 'noise_pollution',
  'tree_fall_obstruction', 'waterlogging_flood', 'stray_animals',
  'encroachment', 'other'
);

create type incident_status as enum (
  'open', 'acknowledged', 'in_progress',
  'resolved', 'closure_rejected', 'reopened', 'invalid'
);

create type user_role as enum ('officer', 'admin');

-- Departments
create table departments (
  id              uuid primary key default gen_random_uuid(),
  code            text unique not null,          -- e.g. 'BMC_ROADS'
  name            text not null,
  name_or         text,                          -- Odia name
  categories      incident_category[] not null,
  sla_hours       int not null default 72,
  telegram_chat_id text,
  created_at      timestamptz default now()
);

-- Officer / admin profiles (linked to auth.users)
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  role          user_role not null default 'officer',
  department_id uuid references departments(id),
  created_at    timestamptz default now()
);

-- Incidents (one real-world problem)
create table incidents (
  id               uuid primary key default gen_random_uuid(),
  ticket_code      text unique not null,          -- e.g. 'NN-BBS-7K3Q'
  category         incident_category not null,
  severity         smallint not null check (severity between 1 and 5),
  severity_reason  text,
  priority_score   numeric(6,2) not null default 0,
  department_id    uuid references departments(id),
  status           incident_status not null default 'open',
  location         geography(Point, 4326) not null,
  lat              double precision not null,
  lng              double precision not null,
  locality         text,
  ward             text,
  title_en         text,
  summary_en       text,
  summary_or       text,
  summary_hi       text,
  risk_to_life     boolean default false,
  cover_photo_path text,
  report_count     int not null default 1,
  complaint_letter text,
  sla_due_at       timestamptz,
  acknowledged_at  timestamptz,
  resolved_at      timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index incidents_location_gix on incidents using gist (location);
create index incidents_status_idx   on incidents (status);
create index incidents_dept_idx     on incidents (department_id, status);

-- Reports (each citizen submission)
create table reports (
  id              uuid primary key default gen_random_uuid(),
  incident_id     uuid not null references incidents(id) on delete cascade,
  photo_path      text,
  audio_path      text,
  text_input      text,
  transcript      text,
  transcript_en   text,
  detected_lang   text,                     -- 'or' | 'hi' | 'en' | ...
  lat             double precision not null,
  lng             double precision not null,
  gps_accuracy_m  double precision,
  reporter_name   text,                     -- PRIVATE
  reporter_phone  text,                     -- PRIVATE
  ai_raw          jsonb,
  is_valid        boolean default true,
  created_at      timestamptz default now()
);
create index reports_incident_idx on reports (incident_id);

-- Resolution attempts
create table resolutions (
  id              uuid primary key default gen_random_uuid(),
  incident_id     uuid not null references incidents(id) on delete cascade,
  officer_id      uuid references profiles(id),
  after_photo_path text not null,
  lat             double precision,
  lng             double precision,
  distance_m      double precision,
  note            text,
  ai_fixed        boolean,
  ai_confidence   numeric(3,2),
  ai_reason       text,
  accepted        boolean,
  created_at      timestamptz default now()
);

-- Audit trail (public)
create table status_log (
  id           bigserial primary key,
  incident_id  uuid not null references incidents(id) on delete cascade,
  from_status  incident_status,
  to_status    incident_status not null,
  actor        text not null,            -- 'system' | 'ai' | officer name
  note         text,
  created_at   timestamptz default now()
);

-- Caches & logs
create table geocode_cache (
  key        text primary key,           -- rounded 'lat,lng' to 4 decimals
  locality   text,
  ward       text,
  raw        jsonb,
  created_at timestamptz default now()
);

create table ai_logs (
  id          bigserial primary key,
  task        text,                      -- 'stt' | 'triage' | 'dedupe' | 'verify'
  provider    text,
  model       text,
  latency_ms  int,
  ok          boolean,
  error       text,
  created_at  timestamptz default now()
);
```

### 10.3 Duplicate-finder function

```sql
create or replace function find_duplicate_incident(
  p_lat double precision,
  p_lng double precision,
  p_category incident_category,
  p_radius_m int default 50
) returns table (id uuid, distance_m double precision, cover_photo_path text)
language sql stable as $$
  select i.id,
         st_distance(i.location, st_makepoint(p_lng, p_lat)::geography) as distance_m,
         i.cover_photo_path
  from incidents i
  where i.category = p_category
    and i.status in ('open','acknowledged','in_progress','closure_rejected','reopened')
    and st_dwithin(i.location, st_makepoint(p_lng, p_lat)::geography, p_radius_m)
  order by distance_m asc
  limit 3;
$$;
```

### 10.4 Public views (no personal data)

```sql
create or replace view public_incidents as
select i.id, i.ticket_code, i.category, i.severity, i.priority_score, i.status,
       i.lat, i.lng, i.locality, i.ward, i.title_en, i.summary_en, i.summary_or,
       i.summary_hi, i.report_count, i.cover_photo_path, i.created_at,
       i.resolved_at, i.sla_due_at, d.name as department_name, d.code as department_code
from incidents i left join departments d on d.id = i.department_id
where i.status <> 'invalid';

create or replace view department_scorecard as
select d.id, d.code, d.name, d.name_or,
  count(i.*)                                                    as total,
  count(*) filter (where i.status in ('open','acknowledged','in_progress','reopened')) as pending,
  count(*) filter (where i.status = 'resolved')                as resolved,
  count(*) filter (where i.status = 'closure_rejected')        as rejected_closures,
  count(*) filter (where i.status <> 'resolved' and i.sla_due_at < now()) as sla_breached,
  round(avg(extract(epoch from (i.resolved_at - i.created_at))/3600)
        filter (where i.resolved_at is not null)::numeric, 1)  as avg_resolution_hours
from departments d left join incidents i on i.department_id = d.id and i.status <> 'invalid'
group by d.id;
```

---

## 11. Incident Lifecycle (State Machine)

```
            ┌──────────── AI: is_valid=false ───────────► INVALID
            │
  [new] ──► OPEN ──► ACKNOWLEDGED ──► IN_PROGRESS ──► (resolve w/ after-photo)
                                                         │
                                  AI fixed & conf≥0.7 ◄──┴──► AI not fixed
                                          │                        │
                                          ▼                        ▼
                                      RESOLVED            CLOSURE_REJECTED ──► IN_PROGRESS
                                          │
                       citizen reopen ≤7d │
                                          ▼
                                      REOPENED ──► IN_PROGRESS
```

| From | To | Actor | Condition |
|---|---|---|---|
| — | open | system | New incident created |
| — | invalid | ai | `is_valid=false` (admin can restore) |
| open | acknowledged | officer | — |
| acknowledged / open | in_progress | officer | — |
| in_progress / closure_rejected | resolved | ai | After-photo passes verification |
| in_progress / closure_rejected | closure_rejected | ai | Verification fails |
| any | resolved | admin | Manual override + note |
| resolved | reopened | citizen | Within 7 days, new photo |

Every transition writes to `status_log`.

---

## 12. AI Pipeline Specification

### 12.1 Provider abstraction

```ts
// lib/ai/types.ts
interface AIProvider {
  transcribe(audio: Buffer, mime: string): Promise<{ text: string; lang: string }>;
  triage(input: TriageInput): Promise<TriageOutput>;
  compareSameIssue(a: ImageRef, b: ImageRef, category: string): Promise<SameIssueOutput>;
  verifyFix(before: ImageRef, after: ImageRef, category: string): Promise<VerifyOutput>;
}
// Order: Gemini → Groq. Each call: timeout 20 s, 1 retry on 429/5xx with backoff (1s, 3s).
```

### 12.2 Step A — Speech-to-text
- **Primary:** Gemini with audio input — prompt: *"Transcribe this audio exactly in its original language and script. Then give an English translation. Return JSON {transcript, lang (ISO 639-1), transcript_en}."*
- **Fallback:** Groq Whisper (`whisper-large-v3-turbo`) → then LLM translate to English.
- Note: Whisper quality for Odia is weak; Gemini is preferred for `or`.

### 12.3 Step B — Triage (vision + text)

**System prompt**
```
You are NagarNetra, a civic-infrastructure triage assistant for Indian cities
(default city: Bhubaneswar, Odisha). Analyse the citizen's photo and description.
Be factual: only describe what is visible or stated. Never invent locations.
Return ONLY JSON matching the provided schema.
```

**User content:** image + text block:
```
Citizen description (English): {transcript_en || text_input || "none"}
Original language: {lang}
Nearby context: {locality}
Allowed categories: {category list}
Severity rubric: {rubric §12.4}
```

**Output schema (Zod)**
```ts
const TriageSchema = z.object({
  is_valid: z.boolean(),                 // false for selfies, memes, unrelated
  invalid_reason: z.string().optional(),
  category: z.enum(CATEGORIES),
  severity: z.number().int().min(1).max(5),
  severity_reason: z.string().max(200),
  risk_to_life: z.boolean(),
  title_en: z.string().max(60),
  summary_en: z.string().max(200),
  summary_or: z.string().max(300),       // Odia script
  summary_hi: z.string().max(300),       // Devanagari
  visible_details: z.array(z.string()).max(5), // e.g. "pothole ~1m wide", "near bus stop"
  confidence: z.number().min(0).max(1)
});
```
Gemini: use `responseMimeType: "application/json"` + `responseSchema`. If parse fails → retry once with "Return valid JSON only." → else fallback provider → else category `other`, severity 3, flag for admin review.

### 12.4 Severity Rubric

| Score | Label | Examples |
|---|---|---|
| **5** | Critical — risk to life | Live wire on road, open manhole on busy road, major main-pipe burst flooding road, fallen tree blocking highway |
| **4** | High | Large pothole on main road, sewage overflow into homes/street, garbage pile near school/hospital, streetlights out on a long stretch |
| **3** | Medium | Medium pothole, steady water leak, overflowing community bin, single streetlight out at junction |
| **2** | Low | Small crack, minor leak, litter, faded markings |
| **1** | Cosmetic | Graffiti, minor aesthetic issues |

Upgrade by +1 (max 5) if visible near school/hospital/bus stop or if `risk_to_life`.

### 12.5 Step C — Same-issue confirmation (dedupe)
Only when PostGIS returns a candidate **and** both have photos.
```ts
const SameIssueSchema = z.object({
  same_issue: z.boolean(),
  confidence: z.number().min(0).max(1),
  reason: z.string().max(150)
});
```
Prompt: *"Image A is an existing complaint, Image B is new. Both are '{category}' within {d} m. Do they show the SAME physical problem (same pothole/leak/pile), possibly from a different angle or time?"*

### 12.6 Step D — Fix verification
```ts
const VerifySchema = z.object({
  fixed: z.boolean(),
  confidence: z.number().min(0).max(1),
  same_location: z.boolean(),           // does the after-photo plausibly show the same spot?
  reason: z.string().max(200),
  remaining_issues: z.array(z.string()).max(3)
});
```
Prompt: *"BEFORE shows a reported '{category}': {summary_en}. AFTER was uploaded by an official claiming it is fixed. Is it the same location, and is the problem fully resolved? Be strict: partial fixes, debris left, or a different location = not fixed."*

Acceptance rule: `fixed && same_location && confidence >= 0.7 && distance_m <= 100`.

### 12.7 Complaint Letter (optional, async)
Generated once per new incident; stored in `incidents.complaint_letter`:
*"Draft a concise formal complaint (≤120 words) to {department.name} about: {summary_en} at {locality} (lat,lng). Reported by {report_count} citizens. Ticket {ticket_code}."*

---

## 13. Duplicate Detection Algorithm

```
input: lat, lng, category, photo

1. candidates = find_duplicate_incident(lat, lng, category, 50)
2. if candidates empty → CREATE new incident
3. best = candidates[0]
4. if best.distance_m <= 15 → MERGE (no AI check needed)
5. else if both photos exist:
       r = compareSameIssue(best.cover_photo, photo)
       if r.same_issue && r.confidence >= 0.6 → MERGE
       else → CREATE
6. else (no photo) → MERGE if distance <= 30 else CREATE

MERGE:
   insert report(incident_id = best.id)
   incidents.report_count += 1
   incidents.severity = max(existing, new)
   recompute priority_score
   status_log('system', note: 'Duplicate merged (#N)')
```

Special radius overrides: `waterlogging_flood` & `air_pollution` → 150 m; `streetlight` → 30 m.

---

## 14. Priority Score

```
priority = severity * 20
         + min(report_count - 1, 10) * 4
         + (risk_to_life ? 25 : 0)
         + min(hours_open / 24, 10) * 2
         + (status = 'closure_rejected' ? 10 : 0)
```
Range ≈ 20–175. Recomputed on every new report/status change and by a daily cron (`/api/cron/recompute`, Vercel cron free on Hobby — once per day).

---

## 15. Category → Department Routing

> Demo mapping for Bhubaneswar; editable in `departments` table. Verify agency responsibilities before any real deployment.

| Category | Department code | Department (demo) | SLA (h) |
|---|---|---|---|
| pothole_road_damage | BMC_ROADS | Bhubaneswar Municipal Corporation — Roads | 72 |
| garbage_waste | BMC_SWM | BMC — Solid Waste Management | 24 |
| sewage_drainage | BMC_DRAIN | BMC — Drainage | 48 |
| streetlight | BMC_LIGHTS | BMC — Street Lighting | 48 |
| stray_animals | BMC_VET | BMC — Veterinary | 72 |
| encroachment | BMC_ENF | BMC — Enforcement | 120 |
| tree_fall_obstruction | BMC_HORT | BMC — Horticulture / Parks | 24 |
| water_leak_supply | WATER | Water supply utility (e.g. WATCO) | 24 |
| electricity_hazard | POWER | Electricity distribution utility (e.g. TPCODL) | 6 |
| air_pollution / water_pollution / noise_pollution | POLLUTION | State Pollution Control Board | 96 |
| waterlogging_flood | DISASTER | City Disaster / Drainage cell | 12 |
| other | ADMIN_DESK | NagarNetra Admin Desk (manual routing) | 72 |

`sla_due_at = created_at + sla_hours` (halved if severity = 5).

---

## 16. API Specification

All routes under `app/api/*`, Node runtime, JSON. Errors: `{ error: { code, message } }` with HTTP status.

### 16.1 `POST /api/upload-url`
Get signed upload URLs (citizen, anonymous; rate-limited by IP).
```json
// request
{ "files": [ { "kind": "photo", "mime": "image/webp" }, { "kind": "audio", "mime": "audio/webm" } ] }
// response 200
{ "uploads": [ { "kind": "photo", "path": "reports/2026/11/uuid.webp", "signedUrl": "...", "token": "..." } ] }
```

### 16.2 `POST /api/report`
```json
// request
{
  "photo_path": "reports/2026/11/uuid.webp",
  "audio_path": "reports/2026/11/uuid.webm",
  "text": "Road broken near bus stop",
  "lat": 20.2961, "lng": 85.8245, "accuracy": 12,
  "ui_lang": "or",
  "reporter": { "name": "Sabita", "phone": "98xxxxxxxx" }
}
// response 201
{
  "ticket_code": "NN-BBS-7K3Q",
  "incident_id": "uuid",
  "merged": true,
  "report_number": 4,
  "category": "pothole_road_damage",
  "severity": 4,
  "department": "BMC — Roads",
  "summary": { "en": "...", "or": "...", "hi": "..." },
  "track_url": "/track/NN-BBS-7K3Q"
}
// 422 if invalid image → { error: { code: "INVALID_REPORT", message: "Photo doesn't show a civic issue" } }
```
Validation: lat/lng inside configured city bounding box (`CITY_BBOX`), at least one media/text, files exist in storage.

### 16.3 `GET /api/incidents`
Public. Query: `status, category, severity_min, dept, bbox=minLng,minLat,maxLng,maxLat, since, limit (≤500)`.
Returns rows from `public_incidents`.

### 16.4 `GET /api/incidents/[idOrTicket]`
Public. Incident + status_log + public report count + photo signed URLs (before/after). No reporter PII.

### 16.5 `GET /api/stats`
Public. `{ totals, by_category[], by_status[], scorecard[] , daily_trend[] (last 30 d) }`.

### 16.6 `PATCH /api/admin/incidents/[id]`
Auth: officer (own department) / admin.
```json
{ "status": "acknowledged" | "in_progress", "note": "Team dispatched",
  "override": { "category": "...", "severity": 3, "department_id": "..." } }  // override: admin only
```

### 16.7 `POST /api/admin/incidents/[id]/resolve`
Auth: officer/admin.
```json
// request
{ "after_photo_path": "resolutions/uuid.webp", "lat": 20.2962, "lng": 85.8246, "note": "Patched" }
// response 200
{ "accepted": false, "status": "closure_rejected",
  "ai": { "fixed": false, "confidence": 0.84, "same_location": true,
          "reason": "Pothole partially filled; loose gravel remains.", "remaining_issues": ["loose gravel"] },
  "distance_m": 14.2 }
```

### 16.8 `POST /api/incidents/[id]/reopen`
Public with ticket code + new photo path. Allowed ≤ 7 days after resolution.

### 16.9 `GET /api/cron/recompute`
Vercel Cron (daily). Header `Authorization: Bearer ${CRON_SECRET}`. Recomputes priority, flags SLA breaches, also pings DB to avoid Supabase pause.

### 16.10 Rate limiting
Simple per-IP limit stored in Postgres (`rate_limits` table) or in-memory per instance: **5 reports / 10 min / IP**, **60 GET / min / IP**.

---

## 17. Frontend Pages & UI Spec

### 17.1 Design system
- Colours: Primary `#0B5FFF` (civic blue), Accent `#FF7A00` (Odia saffron-orange), Severity: 1 `#22C55E`, 2 `#84CC16`, 3 `#EAB308`, 4 `#F97316`, 5 `#DC2626`.
- Fonts: Inter (Latin), Noto Sans Oriya (Odia), Noto Sans Devanagari (Hindi).
- Components: Big round mic button, camera tile, severity chip, status pill, timeline, before/after slider.

### 17.2 `/` — Landing
Hero ("Report it. We route it. AI proves it's fixed."), CTA **Report an Issue**, live counters (reported / resolved / avg fix time), mini-map, 3-step "How it works", language toggle.

### 17.3 `/report` — Report Wizard (3 steps, one screen on mobile)
1. **Capture**: camera tile (opens rear camera), gallery option, big 🎤 hold-to-record (or tap start/stop) with waveform & 60 s timer, optional text.
2. **Location**: auto GPS with accuracy badge; mini-map with draggable pin; locality shown.
3. **Submit** → progress states: *Uploading → Understanding your report → Finding the right department → Done*.
4. **Result card**: ticket code (copy/share), category icon, severity chip, department, Odia summary, "You are report #N for this issue" if merged, buttons: *Track*, *Report another*.

### 17.4 `/track/[ticket]` & `/incident/[id]`
Header (title, ticket, severity, status), photo carousel, before/after slider when resolved, AI verdict box (green/red), map pin, status timeline (from `status_log`), department + SLA countdown, "Reopen" button (if eligible), share button.

### 17.5 `/map` — Public Map
Full-screen Leaflet; clustered markers coloured by severity; side drawer filters (category multiselect, status, severity ≥, date range, department); toggle heatmap layer (`leaflet.heat`); marker popup → incident page; live updates via Realtime.

### 17.6 `/stats` — Transparency Dashboard
KPI tiles (total, open, resolved, avg resolution h, rejected closures, SLA breached); bar chart by category; department scorecard table (sortable, red if SLA breach > 20%); 30-day trend line; "Hall of Fame / Shame" (fastest & slowest departments).

### 17.7 `/admin` — Officer Console (auth)
- `/admin/login`
- Queue table: priority-sorted, filters, columns (ticket, title, severity, reports, age, SLA, status).
- Incident detail drawer: all reports (photos, audio player, transcript, original-language text), AI JSON, complaint letter (copy), actions: Acknowledge, In Progress, **Resolve** (camera upload with GPS) → shows AI verdict instantly.
- Admin-only: override category/severity/department, manage departments, mark invalid/restore.

### 17.8 PWA
`manifest.json` (name, icons, theme colour), installable, offline fallback page; queue report in IndexedDB if offline and submit when online (stretch).

---

## 18. Security & Access Control

### 18.1 Principles
- Browser uses **anon key** only; all writes to `incidents/reports/resolutions` go through API routes using **service role key** (server-only).
- Reporter PII only in `reports` table; never selected in public endpoints.
- EXIF/GPS metadata stripped from images client-side (location stored separately as data).

### 18.2 Row Level Security
```sql
alter table incidents   enable row level security;
alter table reports     enable row level security;
alter table resolutions enable row level security;
alter table status_log  enable row level security;
alter table departments enable row level security;
alter table profiles    enable row level security;

-- Public read of non-PII data
create policy "public read incidents"  on incidents  for select using (status <> 'invalid');
create policy "public read status_log" on status_log for select using (true);
create policy "public read depts"      on departments for select using (true);

-- Reports: only officers of the incident's department or admins
create policy "officer read reports" on reports for select using (
  exists (select 1 from profiles p join incidents i on i.id = reports.incident_id
          where p.id = auth.uid() and (p.role = 'admin' or p.department_id = i.department_id))
);

-- Profiles: self read
create policy "self profile" on profiles for select using (id = auth.uid());
-- No insert/update policies for anon → all writes via service role in API routes.
```

### 18.3 Storage
- Bucket `report-media`: private; uploads via signed upload URL; reads via short-lived signed URLs (1 h) returned by API.
- Bucket `resolution-media`: same.
- Allowed MIME: `image/jpeg, image/png, image/webp, audio/webm, audio/ogg, audio/mp4, video/mp4`; max 10 MB.

### 18.4 Abuse prevention
- IP rate limit (§16.10), city bounding-box check, AI `is_valid` filter, optional hCaptcha/Turnstile (free) on report submit (stretch).

---

## 19. Project Structure

```
nagarnetra/
├── app/
│   ├── layout.tsx                 # fonts, i18n provider, header
│   ├── page.tsx                   # landing
│   ├── report/page.tsx
│   ├── track/[ticket]/page.tsx
│   ├── incident/[id]/page.tsx
│   ├── map/page.tsx
│   ├── stats/page.tsx
│   ├── admin/
│   │   ├── login/page.tsx
│   │   ├── page.tsx               # queue
│   │   └── departments/page.tsx
│   └── api/
│       ├── upload-url/route.ts
│       ├── report/route.ts
│       ├── incidents/route.ts
│       ├── incidents/[id]/route.ts
│       ├── incidents/[id]/reopen/route.ts
│       ├── stats/route.ts
│       ├── admin/incidents/[id]/route.ts
│       ├── admin/incidents/[id]/resolve/route.ts
│       └── cron/recompute/route.ts
├── components/
│   ├── report/ (CameraCapture, VoiceRecorder, LocationPicker, SubmitProgress, ResultCard)
│   ├── map/ (IncidentMap, SeverityMarker, FilterDrawer)
│   ├── incident/ (Timeline, BeforeAfterSlider, AIVerdict, SeverityChip, StatusPill)
│   ├── stats/ (KpiTile, CategoryChart, Scorecard, TrendChart)
│   └── ui/ (shadcn components)
├── lib/
│   ├── supabase/ (client.ts, server.ts, admin.ts)
│   ├── ai/
│   │   ├── types.ts
│   │   ├── gemini.ts
│   │   ├── groq.ts
│   │   ├── index.ts              # provider w/ fallback + logging
│   │   ├── prompts.ts
│   │   └── schemas.ts            # Zod schemas
│   ├── triage.ts                 # orchestrates STT → triage → dedupe → save
│   ├── dedupe.ts
│   ├── priority.ts
│   ├── geocode.ts
│   ├── ticket.ts                 # ticket code generator
│   ├── notify.ts                 # Telegram
│   ├── ratelimit.ts
│   └── i18n/ (en.json, or.json, hi.json, index.tsx)
├── supabase/
│   ├── schema.sql
│   ├── policies.sql
│   └── seed.sql
├── scripts/seed-demo.ts          # generates ~40 Bhubaneswar demo incidents
├── public/ (manifest.json, icons/, sample-images/)
├── tests/ (unit + e2e)
├── vercel.json                   # cron config
├── .env.example
└── README.md
```

---

## 20. Environment Variables

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server only — never expose

GEMINI_API_KEY=
GEMINI_MODEL=                       # copy exact Flash model id from AI Studio
GROQ_API_KEY=
GROQ_STT_MODEL=whisper-large-v3-turbo
GROQ_VISION_MODEL=                  # copy current vision-capable model id from Groq console

NOMINATIM_USER_AGENT="NagarNetra/1.0 (your-email@example.com)"
CITY_NAME=Bhubaneswar
CITY_CODE=BBS
CITY_BBOX=85.70,20.18,85.95,20.42  # minLng,minLat,maxLng,maxLat (approx.)

TELEGRAM_BOT_TOKEN=                 # optional
CRON_SECRET=
NEXT_PUBLIC_APP_URL=https://nagarnetra.vercel.app
```

---

## 21. Deployment Guide (Vercel + Supabase)

1. **Supabase**: create free project (region: Mumbai `ap-south-1`) → SQL editor → run `schema.sql`, `policies.sql`, `seed.sql` → Storage: create `report-media` & `resolution-media` (private) → Auth: enable email provider; create officer users; insert `profiles` rows.
2. **API keys**: Google AI Studio → create Gemini key; console.groq.com → create key; (optional) @BotFather → Telegram bot token.
3. **GitHub**: push repo (`.env` git-ignored).
4. **Vercel**: Import project → Framework: Next.js → add all env vars (Production + Preview) → Deploy.
5. **Cron** (`vercel.json`):
   ```json
   { "crons": [ { "path": "/api/cron/recompute", "schedule": "30 0 * * *" } ] }
   ```
6. **Function config**: in `app/api/report/route.ts` → `export const maxDuration = 60; export const runtime = 'nodejs';`
7. **Smoke test** on phone: report → map → admin resolve → verify.
8. **Before judging**: open app + run seed script to wake Supabase.

---

## 22. Testing Plan

| Type | Tool | Cases |
|---|---|---|
| Unit | Vitest | priority score, ticket code, Zod parsing, dedupe decision logic, bbox check |
| AI eval | Script with 30 labelled images | category accuracy ≥ 80%, severity within ±1 ≥ 85%, invalid-image detection ≥ 90% |
| Integration | Vitest + Supabase local/branch | report create, merge, resolve accept/reject |
| E2E | Playwright | Report flow on mobile viewport (mock camera/mic), map loads, admin resolve |
| Manual | Real phones (Android Chrome, iOS Safari) | Camera, mic permissions, GPS, Odia rendering |
| Load (light) | k6 / simple script | 20 concurrent reports → no failures, graceful 429 handling |

**AI eval set**: 10 potholes, 5 garbage, 5 water leak, 3 streetlight, 3 drain, 4 invalid (selfie, meme, food, blank wall) + 5 before/after pairs (3 fixed, 2 not fixed).

---

## 23. Seed Data

- 12 departments (§15) with Odia names.
- ~40 incidents across real Bhubaneswar localities (e.g. Saheed Nagar, Patia, Nayapalli, Old Town, Chandrasekharpur, Jaydev Vihar, Khandagiri, Rasulgarh), mixed categories, severities and statuses, timestamps over last 30 days so the scorecard and trends look realistic.
- 3 demo officer accounts: `roads@demo`, `water@demo`, `admin@demo`.
- Use royalty-free or self-taken photos only.

---

## 24. Demo Script (3 minutes)

| Time | Action | What judges see |
|---|---|---|
| 0:00 | Problem slide: duplicate complaints, wrong departments, fake closures | Context |
| 0:20 | Phone: open PWA in Odia, snap pothole photo, record Odia voice note, submit | 10-second report |
| 0:45 | Result card: severity 4, BMC Roads, Odia + English summary, ticket | AI triage |
| 1:00 | Second phone reports same pothole | "You're report #2" — merge |
| 1:15 | Public map updates live; heatmap | Transparency |
| 1:35 | Admin login (Roads): priority queue, open incident, complaint letter | Officer workflow |
| 1:55 | Resolve with a photo where pothole still visible | **AI rejects closure** (red) |
| 2:15 | Resolve with proper fixed photo | AI accepts; citizen track page shows before/after slider |
| 2:35 | Stats page: department scorecard, SLA breaches | Accountability |
| 2:50 | Close: ₹0 MVP, scales to WhatsApp + any city | Vision |

---

## 25. Build Timeline

| Day | Deliverables | Done when |
|---|---|---|
| **D1** | Repo, Next.js + Tailwind + shadcn, Supabase schema/policies/buckets, env, first Vercel deploy, i18n scaffold | Live URL shows landing page in 3 languages |
| **D2** | Report wizard (camera, recorder, GPS), signed uploads, `/api/report` with Gemini STT + triage + Zod | Report saved with AI fields |
| **D3** | Dedupe (PostGIS + AI confirm), routing, priority, geocode cache, ticket + track page | Duplicate merges correctly |
| **D4** | Map, stats, admin console, resolve + AI verify, status log, Realtime | Full lifecycle works |
| **D5** | Seed data, Groq fallback, rate-limit, PWA manifest, AI eval run, mobile QA, README, demo video, submission form | Demo rehearsed end-to-end |

Compress to 3 days if needed: drop Realtime, Telegram, reopen flow, Hindi.

---

## 26. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Free-tier rate limits (429) | Failed triage | Backoff + Groq fallback + queue "pending AI" status with retry via cron |
| Odia STT inaccuracy | Wrong summary | Gemini primary for Odia; photo-led classification; show transcript to officers |
| AI misclassification | Wrong department | Confidence < 0.5 → route to Admin Desk; admin override |
| False "fixed" verdict | Trust | Strict prompt, GPS distance check, `same_location` check, citizen reopen |
| Vercel body/time limits | Upload failures | Direct-to-storage uploads, compression, `maxDuration` |
| Supabase pause on inactivity | Demo down | Daily cron ping; open app before judging |
| Spam / fake reports | Noise | IP rate limit, bbox check, `is_valid` filter, optional Turnstile |
| Privacy of reporters | Legal/ethical | PII isolated, RLS, EXIF strip, demo data only on free AI tier |
| OSM/Nominatim policy | Blocked | Caching, User-Agent, low request rate |

---

## 27. Production Roadmap (Paid)

| Phase | Additions |
|---|---|
| **P1 — Pilot** | Vercel Pro, Supabase Pro, paid Gemini/Claude tier (data not used for training), custom domain, Turnstile, monitoring (Sentry) |
| **P2 — Channels** | WhatsApp Cloud API intake bot, IVR/missed-call voice reporting, SMS status updates |
| **P3 — Language** | Self-hosted / Indic STT & TTS (e.g. AI4Bharat models) for Odia + more Indian languages, voice replies |
| **P4 — Integration** | Push to state/municipal grievance portals, ICCC (command centre) dashboards, ward-boundary GeoJSON, officer mobile app |
| **P5 — Intelligence** | Predictive hotspots (monsoon waterlogging, recurring potholes), contractor quality scores, CCTV-based auto-detection, budget impact reports |

---

## 28. Success Metrics

| Metric | MVP target |
|---|---|
| Time to report | ≤ 30 s median |
| AI triage latency | ≤ 10 s p95 |
| Category accuracy (eval set) | ≥ 80% |
| Duplicate merge precision | ≥ 85% |
| Fix-verification accuracy (eval pairs) | ≥ 80% |
| Lighthouse mobile performance | ≥ 85 |
| Running cost | ₹0 |

---

## 29. Glossary

| Term | Meaning |
|---|---|
| Incident | One real-world civic problem (may have many reports) |
| Report | One citizen submission |
| Merge | Attaching a new report to an existing incident |
| Severity | AI-assigned 1–5 seriousness |
| Priority score | Ranking combining severity, report count, age, risk |
| SLA | Target resolution time per department |
| Closure rejected | Officer claimed fixed; AI found otherwise |
| PostGIS | Postgres extension for geographic queries |
| RLS | Row Level Security in Postgres/Supabase |
| PWA | Progressive Web App — installable web app |
| ICCC | Integrated Command & Control Centre |
