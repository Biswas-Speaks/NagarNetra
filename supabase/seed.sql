-- ═════════════════════════════════════════════════════════════════════════════
-- NagarNetra — demo seed data (§23)
-- 12 generic city departments + 40 synthetic demo incidents (Bhubaneswar) over 30 days.
-- Demo officer accounts are created by `npm run seed:demo` (needs Auth API).
-- Safe to re-run: wipes previous demo incidents (ticket codes NN-BBS-D###).
-- ═════════════════════════════════════════════════════════════════════════════

insert into departments (code, name, name_or, categories, sla_hours) values
  ('BMC_ROADS',  'Municipal Corporation — Roads', 'ମହାନଗର ନିଗମ — ରାସ୍ତା', '{pothole_road_damage}', 72),
  ('BMC_SWM',    'Municipal — Solid Waste Management',  'ପୌର ନିଗମ — କଠିନ ବର୍ଜ୍ୟ ପରିଚାଳନା', '{garbage_waste}', 24),
  ('BMC_DRAIN',  'Municipal — Drainage',                'ପୌର ନିଗମ — ଡ୍ରେନେଜ',             '{sewage_drainage}', 48),
  ('BMC_LIGHTS', 'Municipal — Street Lighting',         'ପୌର ନିଗମ — ରାସ୍ତା ଆଲୋକ',          '{streetlight}', 48),
  ('BMC_VET',    'Municipal — Veterinary',              'ପୌର ନିଗମ — ପଶୁ ଚିକିତ୍ସା',          '{stray_animals}', 72),
  ('BMC_ENF',    'Municipal — Enforcement',             'ପୌର ନିଗମ — ଏନଫୋର୍ସମେଣ୍ଟ',         '{encroachment}', 120),
  ('BMC_HORT',   'Municipal — Horticulture / Parks',    'ପୌର ନିଗମ — ଉଦ୍ୟାନ',               '{tree_fall_obstruction}', 24),
  ('WATER',      'Water Supply Utility',          'ଜଳ ଯୋଗାଣ ସଂସ୍ଥା',               '{water_leak_supply}', 24),
  ('POWER',      'Electricity Distribution Utility', 'ବିଦ୍ୟୁତ ବଣ୍ଟନ ସଂସ୍ଥା',         '{electricity_hazard}', 6),
  ('POLLUTION',  'State Pollution Control Board', 'ରାଜ୍ୟ ପ୍ରଦୂଷଣ ନିୟନ୍ତ୍ରଣ ବୋର୍ଡ',      '{air_pollution,water_pollution,noise_pollution}', 96),
  ('DISASTER',   'City Disaster / Drainage Cell', 'ବିପର୍ଯ୍ୟୟ ପରିଚାଳନା ସେଲ',          '{waterlogging_flood}', 12),
  ('ADMIN_DESK', 'NagarNetra Admin Desk',         'ନଗରନେତ୍ର ପ୍ରଶାସନ ଡେସ୍କ',          '{other}', 72)
on conflict (code) do update
  set name = excluded.name, name_or = excluded.name_or,
      categories = excluded.categories, sla_hours = excluded.sla_hours;

delete from incidents where ticket_code like 'NN-BBS-D%';

do $$
declare
  localities text[] := array['Saheed Nagar','Patia','Nayapalli','Old Town','Chandrasekharpur',
                             'Jaydev Vihar','Khandagiri','Rasulgarh'];
  lats float8[] := array[20.2900, 20.3530, 20.2930, 20.2400, 20.3240, 20.3000, 20.2580, 20.2930];
  lngs float8[] := array[85.8440, 85.8180, 85.8050, 85.8350, 85.8150, 85.8180, 85.7800, 85.8600];
  cats incident_category[] := array['pothole_road_damage','garbage_waste','water_leak_supply',
    'streetlight','sewage_drainage','pothole_road_damage','garbage_waste','electricity_hazard',
    'waterlogging_flood','tree_fall_obstruction','stray_animals','air_pollution']::incident_category[];
  titles text[] := array['Large pothole on main road','Garbage pile on roadside','Water pipe leaking',
    'Streetlight not working','Open drain overflowing','Road surface broken','Overflowing community bin',
    'Loose electric wire hanging','Waterlogged street','Fallen tree branch on road','Stray cattle on road',
    'Smoke from waste burning'];
  statuses incident_status[] := array['open','open','acknowledged','in_progress','resolved',
    'resolved','closure_rejected','open','in_progress','resolved']::incident_status[];
  i int; li int; ci int; sev int; st incident_status; created timestamptz; dept record;
  inc_id uuid; reports_n int;
begin
  for i in 1..40 loop
    li := 1 + (i % array_length(localities, 1));
    ci := 1 + (i * 7 % array_length(cats, 1));
    st := statuses[1 + (i % array_length(statuses, 1))];
    sev := least(5, 1 + (i * 3 % 5) + case when cats[ci] = 'electricity_hazard' then 2 else 0 end);
    created := now() - make_interval(hours => (i * 17) % (30 * 24));
    reports_n := 1 + (i % 4);
    select * into dept from departments where cats[ci] = any(categories) limit 1;

    insert into incidents (ticket_code, category, severity, severity_reason, department_id, status,
      lat, lng, locality, title_en, summary_en, risk_to_life, report_count, sla_due_at,
      acknowledged_at, resolved_at, created_at, ai_confidence)
    values (
      format('NN-BBS-D%s', lpad(i::text, 3, '0')), cats[ci], sev,
      'Seeded demo data', dept.id, st,
      lats[li] + ((i % 9) - 4) * 0.0018, lngs[li] + ((i % 7) - 3) * 0.0021,
      localities[li], titles[ci],
      format('%s reported near %s by %s citizen(s).', titles[ci], localities[li], reports_n),
      sev = 5, reports_n,
      created + make_interval(hours => case when sev = 5 then dept.sla_hours / 2 else dept.sla_hours end),
      case when st <> 'open' then created + interval '3 hours' end,
      case when st = 'resolved' then created + make_interval(hours => 6 + (i * 5) % 90) end,
      created, 0.9)
    returning id into inc_id;

    insert into reports (incident_id, text_input, lat, lng, detected_lang, created_at)
    select inc_id, titles[ci], lats[li], lngs[li], 'en', created + make_interval(mins => g * 40)
    from generate_series(0, reports_n - 1) g;

    insert into status_log (incident_id, from_status, to_status, actor, note, created_at)
    values (inc_id, null, 'open', 'system', 'Incident created', created);
    if st <> 'open' then
      insert into status_log (incident_id, from_status, to_status, actor, note, created_at)
      values (inc_id, 'open', st, case when st in ('resolved','closure_rejected') then 'ai' else 'officer' end,
              'Seeded transition', created + interval '3 hours');
    end if;
  end loop;
end $$;

select recompute_priorities();
