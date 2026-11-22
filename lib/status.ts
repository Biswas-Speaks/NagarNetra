import type { IncidentStatus } from "./constants";

export type Actor = "system" | "ai" | "officer" | "admin" | "citizen";

/** Incidents that can accept a resolve attempt (AI verdict). */
export const RESOLVABLE: IncidentStatus[] = ["open", "acknowledged", "in_progress", "closure_rejected", "reopened"];

/** §11 — manual transitions an officer may make. */
const OFFICER_TRANSITIONS: Partial<Record<IncidentStatus, IncidentStatus[]>> = {
  open: ["acknowledged", "in_progress"],
  acknowledged: ["in_progress"],
  closure_rejected: ["in_progress"],
  reopened: ["in_progress"],
};

export function canTransition(from: IncidentStatus, to: IncidentStatus, actor: Actor): boolean {
  switch (actor) {
    case "admin":
      // Admin override; the mandatory note is enforced at the API layer.
      return from !== to;
    case "officer":
      return OFFICER_TRANSITIONS[from]?.includes(to) ?? false;
    case "ai":
      return RESOLVABLE.includes(from) && (to === "resolved" || to === "closure_rejected");
    case "citizen":
      return from === "resolved" && to === "reopened";
    default:
      return false;
  }
}
