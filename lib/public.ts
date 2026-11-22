import "server-only";
import { ApiError } from "./api";
import { REOPEN_WINDOW_DAYS } from "./constants";
import { signedReadUrl } from "./storage";
import { getAdminSupabase } from "./supabase/admin";
import { TICKET_PATTERN } from "./ticket";
import type { IncidentDetail, PublicIncident, Resolution, ScorecardRow, Stats, StatusLogEntry } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function canReopen(i: Pick<PublicIncident, "status" | "resolved_at">, now = new Date()): boolean {
  if (i.status !== "resolved" || !i.resolved_at) return false;
  return now.getTime() - new Date(i.resolved_at).getTime() <= REOPEN_WINDOW_DAYS * 86_400_000;
}

/** Shared by GET /api/incidents/[id] and the track/incident pages. No reporter PII. */
export async function getIncidentDetail(idOrTicket: string): Promise<IncidentDetail> {
  const key = idOrTicket.trim();
  const column = UUID.test(key) ? "id" : TICKET_PATTERN.test(key.toUpperCase()) ? "ticket_code" : null;
  if (!column) throw new ApiError(404, "NOT_FOUND", "Incident not found");

  const db = getAdminSupabase();
  const { data: incident } = await db
    .from("public_incidents")
    .select("*")
    .eq(column, column === "ticket_code" ? key.toUpperCase() : key)
    .maybeSingle<PublicIncident>();
  if (!incident) throw new ApiError(404, "NOT_FOUND", "Incident not found");

  const [{ data: timeline }, { data: resolution }] = await Promise.all([
    db
      .from("status_log")
      .select("id, from_status, to_status, actor, note, created_at")
      .eq("incident_id", incident.id)
      .order("created_at", { ascending: true })
      .returns<StatusLogEntry[]>(),
    db
      .from("resolutions")
      .select(
        "id, after_photo_path, distance_m, note, ai_fixed, ai_confidence, ai_same_location, ai_reason, remaining_issues, accepted, created_at",
      )
      .eq("incident_id", incident.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Resolution>(),
  ]);

  const [before, after] = await Promise.all([
    signedReadUrl(incident.cover_photo_path),
    signedReadUrl(resolution?.after_photo_path),
  ]);

  return {
    incident,
    timeline: timeline ?? [],
    photos: { before, after },
    latest_resolution: resolution ?? null,
    can_reopen: canReopen(incident),
  };
}

/** §16.5 — aggregates computed in Node from the PII-free view (fine at MVP scale). */
export async function getStats(): Promise<Stats> {
  const db = getAdminSupabase();
  const [{ data: rows }, { data: scorecard }] = await Promise.all([
    db
      .from("public_incidents")
      .select("category, status, created_at, resolved_at, sla_due_at")
      .returns<Pick<PublicIncident, "category" | "status" | "created_at" | "resolved_at" | "sla_due_at">[]>(),
    db.from("department_scorecard").select("*").order("total", { ascending: false }).returns<ScorecardRow[]>(),
  ]);
  const all = rows ?? [];
  const now = Date.now();

  const count = <K extends string>(key: (r: (typeof all)[number]) => K) => {
    const m = new Map<K, number>();
    all.forEach((r) => m.set(key(r), (m.get(key(r)) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };

  const resolvedRows = all.filter((r) => r.resolved_at);
  const avgHours = resolvedRows.length
    ? resolvedRows.reduce((s, r) => s + (new Date(r.resolved_at!).getTime() - new Date(r.created_at).getTime()) / 3_600_000, 0) /
      resolvedRows.length
    : null;

  const days: Stats["daily_trend"] = [];
  for (let d = 29; d >= 0; d--) {
    const date = new Date(now - d * 86_400_000).toISOString().slice(0, 10);
    days.push({ date, reported: 0, resolved: 0 });
  }
  const dayIndex = new Map(days.map((d, i) => [d.date, i]));
  all.forEach((r) => {
    const c = dayIndex.get(r.created_at.slice(0, 10));
    if (c !== undefined) days[c].reported++;
    const s = r.resolved_at ? dayIndex.get(r.resolved_at.slice(0, 10)) : undefined;
    if (s !== undefined) days[s].resolved++;
  });

  return {
    totals: {
      total: all.length,
      open: all.filter((r) => ["open", "acknowledged", "in_progress", "reopened"].includes(r.status)).length,
      resolved: resolvedRows.length,
      rejected_closures: all.filter((r) => r.status === "closure_rejected").length,
      sla_breached: all.filter((r) => r.status !== "resolved" && r.sla_due_at && new Date(r.sla_due_at).getTime() < now).length,
      avg_resolution_hours: avgHours === null ? null : Math.round(avgHours * 10) / 10,
    },
    by_category: count((r) => r.category).map(([category, c]) => ({ category, count: c })),
    by_status: count((r) => r.status).map(([status, c]) => ({ status, count: c })),
    scorecard: (scorecard ?? []).map((s) => ({
      ...s,
      avg_resolution_hours: s.avg_resolution_hours === null ? null : Number(s.avg_resolution_hours),
    })),
    daily_trend: days,
  };
}
