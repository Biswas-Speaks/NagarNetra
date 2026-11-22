import type { IncidentStatus } from "./constants";

export interface PriorityInput {
  severity: number;
  report_count: number;
  risk_to_life: boolean;
  created_at: string | Date;
  status: IncidentStatus;
}

/** §14 — keep in sync with `recompute_priorities()` in supabase/schema.sql. */
export function computePriority(i: PriorityInput, now: Date = new Date()): number {
  const hoursOpen = Math.max(0, (now.getTime() - new Date(i.created_at).getTime()) / 3_600_000);
  const score =
    i.severity * 20 +
    Math.min(Math.max(i.report_count - 1, 0), 10) * 4 +
    (i.risk_to_life ? 25 : 0) +
    Math.min(hoursOpen / 24, 10) * 2 +
    (i.status === "closure_rejected" ? 10 : 0);
  return Math.round(score * 100) / 100;
}

/** §15 — SLA is halved for critical incidents. */
export function slaDueAt(createdAt: Date, slaHours: number, severity: number): Date {
  const hours = severity === 5 ? slaHours / 2 : slaHours;
  return new Date(createdAt.getTime() + hours * 3_600_000);
}

/** §12.4 — +1 (max 5) when risk to life or near a sensitive site. */
export function adjustSeverity(severity: number, riskToLife: boolean, nearSensitiveSite: boolean): number {
  return Math.min(5, severity + (riskToLife || nearSensitiveSite ? 1 : 0));
}
