-- ═════════════════════════════════════════════════════════════════════════════
-- NagarNetra — database schema
-- Run order in the Supabase SQL editor: schema.sql → policies.sql → seed.sql
-- ═════════════════════════════════════════════════════════════════════════════

create extension if not exists postgis;
create extension if not exists pgcrypto;

-- ── Enums ────────────────────────────────────────────────────────────────────
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

-- ── Departments ──────────────────────────────────────────────────────────────
create table departments (
  id               uuid primary key default gen_random_uuid(),
  code             text unique not null,
  name             text not null,
  name_or          text,
  categories       incident_category[] not null,
  sla_hours        int not null default 72 check (sla_hours > 0),
  telegram_chat_id text,
  created_at       timestamptz not null default now()
);

-- ── Officer / admin profiles ─────────────────────────────────────────────────
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  role          user_role not null default 'officer',
  department_id uuid references departments(id),
  created_at    timestamptz not null default now()
);

-- ── Incidents (one real-world problem) ───────────────────────────────────────
create table incidents (
  id               uuid primary key default gen_random_uuid(),
  ticket_code      text unique not null,
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
  risk_to_life     boolean not null default false,
  ai_confidence    numeric(3,2),
  needs_review     boolean not null default false,
  cover_photo_path text,
  report_count     int not null default 1,
  complaint_letter text,
  sla_due_at       timestamptz,
  acknowledged_at  timestamptz,
  resolved_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index incidents_location_gix on incidents using gist (location);
create index incidents_status_idx   on incidents (status);
create index incidents_dept_idx     on incidents (department_id, status);
create index incidents_created_idx  on incidents (created_at desc);

-- Keep `location` in sync with lat/lng so callers only write plain numbers.
create or replace function incidents_sync_location() returns trigger
language plpgsql as $$
begin
  new.location := st_setsrid(st_makepoint(new.lng, new.lat), 4326)::geography;
  new.updated_at := now();
  return new;
end $$;

create trigger incidents_sync_location
  before insert or update on incidents for each row execute function incidents_sync_location();

-- ── Reports (each citizen submission) ────────────────────────────────────────
create table reports (
  id             uuid primary key default gen_random_uuid(),
  incident_id    uuid not null references incidents(id) on delete cascade,
  photo_path     text,
  audio_path     text,
  text_input     text,
  transcript     text,
  transcript_en  text,
  detected_lang  text,
  lat            double precision not null,
  lng            double precision not null,
  gps_accuracy_m double precision,
  reporter_name  text,               -- PRIVATE
  reporter_phone text,               -- PRIVATE
  ai_raw         jsonb,
  is_valid       boolean not null default true,
  created_at     timestamptz not null default now()
);
create index reports_incident_idx on reports (incident_id);

-- ── Resolution attempts ──────────────────────────────────────────────────────
create table resolutions (
  id               uuid primary key default gen_random_uuid(),
  incident_id      uuid not null references incidents(id) on delete cascade,
  officer_id       uuid references profiles(id),
  after_photo_path text not null,
  lat              double precision,
  lng              double precision,
  distance_m       double precision,
  note             text,
  ai_fixed         boolean,
  ai_confidence    numeric(3,2),
  ai_same_location boolean,
  ai_reason        text,
  remaining_issues text[],
  accepted         boolean,
  created_at       timestamptz not null default now()
);
create index resolutions_incident_idx on resolutions (incident_id, created_at desc);

-- ── Audit trail (public) ─────────────────────────────────────────────────────
create table status_log (
  id          bigserial primary key,
  incident_id uuid not null references incidents(id) on delete cascade,
  from_status incident_status,
  to_status   incident_status not null,
  actor       text not null,          -- 'system' | 'ai' | 'citizen' | officer name
  note        text,
  created_at  timestamptz not null default now()
);
create index status_log_incident_idx on status_log (incident_id, created_at);

-- ── Caches, logs, rate limits ────────────────────────────────────────────────
create table geocode_cache (
  key        text primary key,        -- 'lat,lng' rounded to 4 decimals
  locality   text,
  ward       text,
  raw        jsonb,
  created_at timestamptz not null default now()
);

create table ai_logs (
  id         bigserial primary key,
  task       text,                    -- 'stt' | 'triage' | 'dedupe' | 'verify' | 'letter'
  provider   text,
  model      text,
  latency_ms int,
  ok         boolean,
  error      text,
  created_at timestamptz not null default now()
);

create table rate_limits (
  key          text primary key,      -- '<bucket>:<ip>'
  window_start timestamptz not null,
  hits         int not null
);

-- Fixed-window counter. Returns true when the request is allowed.
create or replace function hit_rate_limit(p_key text, p_window_s int, p_max int)
returns boolean language plpgsql as $$
declare v_hits int;
begin
  insert into rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case when r.window_start < now() - make_interval(secs => p_window_s)
                    then 1 else r.hits + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_s)
                            then now() else r.window_start end
  returning hits into v_hits;
  return v_hits <= p_max;
end $$;

-- ── Duplicate finder (§10.3) ─────────────────────────────────────────────────
create or replace function find_duplicate_incident(
  p_lat double precision,
  p_lng double precision,
  p_category incident_category,
  p_radius_m int default 50
) returns table (id uuid, distance_m double precision, cover_photo_path text)
language sql stable as $$
  select i.id,
         st_distance(i.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) as distance_m,
         i.cover_photo_path
  from incidents i
  where i.category = p_category
    and i.status in ('open','acknowledged','in_progress','closure_rejected','reopened')
    and st_dwithin(i.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_m)
  order by distance_m asc
  limit 3;
$$;

-- ── Priority recompute (§14) — mirrors lib/priority.ts, used by daily cron ──
create or replace function recompute_priorities() returns int
language plpgsql as $$
declare v_count int;
begin
  update incidents i set priority_score =
      i.severity * 20
    + least(i.report_count - 1, 10) * 4
    + case when i.risk_to_life then 25 else 0 end
    + least(extract(epoch from (now() - i.created_at)) / 3600 / 24, 10) * 2
    + case when i.status = 'closure_rejected' then 10 else 0 end
  where i.status not in ('resolved', 'invalid');
  get diagnostics v_count = row_count;
  delete from rate_limits where window_start < now() - interval '1 day';
  return v_count;
end $$;

-- ── Public views (no personal data) ──────────────────────────────────────────
create or replace view public_incidents with (security_invoker = true) as
select i.id, i.ticket_code, i.category, i.severity, i.priority_score, i.status,
       i.lat, i.lng, i.locality, i.ward, i.title_en, i.summary_en, i.summary_or,
       i.summary_hi, i.report_count, i.cover_photo_path, i.risk_to_life, i.created_at,
       i.resolved_at, i.sla_due_at, i.department_id,
       d.name as department_name, d.code as department_code
from incidents i left join departments d on d.id = i.department_id
where i.status <> 'invalid';

create or replace view department_scorecard with (security_invoker = true) as
select d.id, d.code, d.name, d.name_or, d.sla_hours,
  count(i.id)                                                                          as total,
  count(i.id) filter (where i.status in ('open','acknowledged','in_progress','reopened')) as pending,
  count(i.id) filter (where i.status = 'resolved')                                     as resolved,
  count(i.id) filter (where i.status = 'closure_rejected')                             as rejected_closures,
  count(i.id) filter (where i.status <> 'resolved' and i.sla_due_at < now())           as sla_breached,
  round((avg(extract(epoch from (i.resolved_at - i.created_at)) / 3600)
        filter (where i.resolved_at is not null))::numeric, 1)                         as avg_resolution_hours
from departments d
left join incidents i on i.department_id = d.id and i.status <> 'invalid'
group by d.id;

-- ── Storage buckets (private; access via signed URLs) ────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('report-media', 'report-media', false, 10485760,
   array['image/jpeg','image/png','image/webp','audio/webm','audio/ogg','audio/mp4','video/mp4']),
  ('resolution-media', 'resolution-media', false, 10485760,
   array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- ── Realtime: broadcast incident changes to the public map ──────────────────
alter publication supabase_realtime add table incidents;
