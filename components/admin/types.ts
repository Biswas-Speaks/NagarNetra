import type { Category, IncidentStatus } from "@/lib/constants";
import type { Department, IncidentRow, Resolution, StatusLogEntry } from "@/lib/types";

export interface QueueRow {
  id: string;
  ticket_code: string;
  title_en: string | null;
  category: Category;
  severity: number;
  priority_score: number;
  status: IncidentStatus;
  report_count: number;
  locality: string | null;
  created_at: string;
  sla_due_at: string | null;
  needs_review: boolean;
  departments: { name: string; code: string } | null;
}

export interface AdminReport {
  id: string;
  photo_url: string | null;
  audio_url: string | null;
  text_input: string | null;
  transcript: string | null;
  transcript_en: string | null;
  detected_lang: string | null;
  reporter_name: string | null;
  reporter_phone: string | null;
  ai_raw: unknown;
  created_at: string;
}

export interface AdminDetail {
  incident: IncidentRow;
  department: Department | null;
  reports: AdminReport[];
  resolutions: (Resolution & { after_url: string | null })[];
  timeline: StatusLogEntry[];
  me: { role: "officer" | "admin" };
}
