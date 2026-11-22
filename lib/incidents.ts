import "server-only";
import { ADMIN_DESK_CODE, type Category, type IncidentStatus } from "./constants";
import { ApiError } from "./api";
import { computePriority } from "./priority";
import { getAdminSupabase } from "./supabase/admin";
import type { Department, IncidentRow } from "./types";

export async function getIncident(id: string): Promise<IncidentRow> {
  const { data } = await getAdminSupabase().from("incidents").select("*").eq("id", id).maybeSingle<IncidentRow>();
  if (!data) throw new ApiError(404, "NOT_FOUND", "Incident not found");
  return data;
}

export async function departmentForCategory(category: Category): Promise<Department | null> {
  const db = getAdminSupabase();
  const { data } = await db.from("departments").select("*").contains("categories", [category]).limit(1).maybeSingle<Department>();
  if (data) return data;
  const { data: desk } = await db.from("departments").select("*").eq("code", ADMIN_DESK_CODE).maybeSingle<Department>();
  return desk;
}

export async function departmentById(id: string | null): Promise<Department | null> {
  if (!id) return null;
  const { data } = await getAdminSupabase().from("departments").select("*").eq("id", id).maybeSingle<Department>();
  return data;
}

export async function logStatus(
  incidentId: string,
  from: IncidentStatus | null,
  to: IncidentStatus,
  actor: string,
  note?: string,
) {
  await getAdminSupabase().from("status_log").insert({ incident_id: incidentId, from_status: from, to_status: to, actor, note });
}

/**
 * Applies a status (and optional field) change, recomputes priority and writes the audit log.
 * Every transition in §11 goes through here.
 */
export async function transition(
  incident: IncidentRow,
  to: IncidentStatus,
  actor: string,
  note?: string,
  extra: Record<string, unknown> = {},
) {
  const now = new Date();
  const patch: Record<string, unknown> = { status: to, ...extra };
  if (to === "acknowledged" && !incident.acknowledged_at) patch.acknowledged_at = now.toISOString();
  if (to === "resolved") patch.resolved_at = now.toISOString();
  if (to === "reopened") patch.resolved_at = null;
  patch.priority_score = computePriority(
    {
      severity: (extra.severity as number | undefined) ?? incident.severity,
      report_count: incident.report_count,
      risk_to_life: incident.risk_to_life,
      created_at: incident.created_at,
      status: to,
    },
    now,
  );

  const { error } = await getAdminSupabase().from("incidents").update(patch).eq("id", incident.id);
  if (error) throw new ApiError(500, "DB_ERROR", "Could not update incident");
  if (to !== incident.status) await logStatus(incident.id, incident.status, to, actor, note);
}
