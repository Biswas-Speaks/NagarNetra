-- ═════════════════════════════════════════════════════════════════════════════
-- NagarNetra — Row Level Security (§18)
-- The browser only ever holds the anon key. All writes go through API routes
-- using the service-role key, which bypasses RLS.
-- ═════════════════════════════════════════════════════════════════════════════

alter table incidents     enable row level security;
alter table reports       enable row level security;
alter table resolutions   enable row level security;
alter table status_log    enable row level security;
alter table departments   enable row level security;
alter table profiles      enable row level security;
alter table geocode_cache enable row level security;
alter table ai_logs       enable row level security;
alter table rate_limits   enable row level security;

-- Public read of non-PII data
create policy "public read incidents"  on incidents   for select using (status <> 'invalid');
create policy "public read status_log" on status_log  for select using (true);
create policy "public read depts"      on departments for select using (true);
create policy "public read resolutions" on resolutions for select using (true);

-- Reports contain PII: only officers of the incident's department, or admins
create policy "officer read reports" on reports for select using (
  exists (
    select 1 from profiles p
    join incidents i on i.id = reports.incident_id
    where p.id = auth.uid()
      and (p.role = 'admin' or p.department_id = i.department_id)
  )
);

-- Profiles: self read
create policy "self profile" on profiles for select using (id = auth.uid());

-- geocode_cache, ai_logs, rate_limits: no policies → service role only.
-- No insert/update/delete policies for anon/authenticated → all writes via API.

-- ── Table privileges ─────────────────────────────────────────────────────────
-- Newer Supabase projects don't auto-grant API roles on tables created via SQL,
-- so grant explicitly. RLS above still decides which rows each role can see.
grant usage on schema public to anon, authenticated, service_role;

-- Server (service-role / secret key): full access for API routes.
-- (Listed explicitly: PostGIS objects in `public` belong to supabase_admin.)
grant all on departments, profiles, incidents, reports, resolutions, status_log,
             geocode_cache, ai_logs, rate_limits, public_incidents, department_scorecard
  to service_role;
grant all on sequence status_log_id_seq, ai_logs_id_seq to service_role;
grant execute on function
  hit_rate_limit(text, int, int),
  recompute_priorities(),
  find_duplicate_incident(double precision, double precision, incident_category, int)
  to service_role;

-- Public map/stats data (rows filtered by the policies above).
grant select on incidents, status_log, departments, resolutions to anon, authenticated;
grant select on public_incidents, department_scorecard to anon, authenticated;

-- Staff-only data; RLS limits reports to the officer's department, profiles to self.
grant select on reports, profiles to authenticated;

-- Server-only RPCs must not be callable with the anon/publishable key.
revoke execute on function hit_rate_limit(text, int, int) from public, anon, authenticated;
revoke execute on function recompute_priorities() from public, anon, authenticated;
revoke execute on function find_duplicate_incident(double precision, double precision, incident_category, int)
  from public, anon, authenticated;
