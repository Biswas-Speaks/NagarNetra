import type { Category, IncidentStatus } from "./constants";

export interface Department {
  id: string;
  code: string;
  name: string;
  name_or: string | null;
  categories: Category[];
  sla_hours: number;
  telegram_chat_id: string | null;
}

/** Row shape of the `public_incidents` view — never contains reporter PII. */
export interface PublicIncident {
  id: string;
  ticket_code: string;
  category: Category;
  severity: number;
  priority_score: number;
  status: IncidentStatus;
  lat: number;
  lng: number;
  locality: string | null;
  ward: string | null;
  title_en: string | null;
  summary_en: string | null;
  summary_or: string | null;
  summary_hi: string | null;
  report_count: number;
  cover_photo_path: string | null;
  risk_to_life: boolean;
  created_at: string;
  resolved_at: string | null;
  sla_due_at: string | null;
  department_id: string | null;
  department_name: string | null;
  department_code: string | null;
}

export interface IncidentRow extends Omit<PublicIncident, "department_name" | "department_code"> {
  severity_reason: string | null;
  complaint_letter: string | null;
  ai_confidence: number | null;
  needs_review: boolean;
  acknowledged_at: string | null;
}

export interface StatusLogEntry {
  id: number;
  from_status: IncidentStatus | null;
  to_status: IncidentStatus;
  actor: string;
  note: string | null;
  created_at: string;
}

export interface Resolution {
  id: string;
  after_photo_path: string;
  distance_m: number | null;
  note: string | null;
  ai_fixed: boolean | null;
  ai_confidence: number | null;
  ai_same_location: boolean | null;
  ai_reason: string | null;
  remaining_issues: string[] | null;
  accepted: boolean | null;
  created_at: string;
}

export interface ScorecardRow {
  id: string;
  code: string;
  name: string;
  name_or: string | null;
  sla_hours: number;
  total: number;
  pending: number;
  resolved: number;
  rejected_closures: number;
  sla_breached: number;
  avg_resolution_hours: number | null;
}

export interface StaffProfile {
  id: string;
  full_name: string | null;
  role: "officer" | "admin";
  department_id: string | null;
}

/** GET /api/stats payload (§16.5). */
export interface Stats {
  totals: {
    total: number;
    open: number;
    resolved: number;
    rejected_closures: number;
    sla_breached: number;
    avg_resolution_hours: number | null;
  };
  by_category: { category: string; count: number }[];
  by_status: { status: string; count: number }[];
  scorecard: ScorecardRow[];
  daily_trend: { date: string; reported: number; resolved: number }[];
}

/** Incident detail returned by GET /api/incidents/[idOrTicket]. */
export interface IncidentDetail {
  incident: PublicIncident;
  timeline: StatusLogEntry[];
  photos: { before: string | null; after: string | null };
  latest_resolution: Resolution | null;
  can_reopen: boolean;
}
