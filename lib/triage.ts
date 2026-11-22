import "server-only";
import { after } from "next/server";
import { ai, type MediaRef, type TriageOutput } from "./ai";
import { letterPrompt } from "./ai/prompts";
import { ApiError } from "./api";
import { ADMIN_DESK_CODE, LOW_CONFIDENCE_ROUTE_THRESHOLD, type Category } from "./constants";
import { decideDedupe, dedupeRadius } from "./dedupe";
import { serverEnv } from "./env/server";
import { reverseGeocode } from "./geocode";
import { departmentForCategory, getIncident, logStatus } from "./incidents";
import { notifyDepartment } from "./notify";
import { adjustSeverity, computePriority, slaDueAt } from "./priority";
import { downloadMedia } from "./storage";
import { getAdminSupabase } from "./supabase/admin";
import { generateTicketCode } from "./ticket";
import type { Department } from "./types";

export interface ReportInput {
  photo_path?: string | null;
  audio_path?: string | null;
  text?: string | null;
  lat: number;
  lng: number;
  accuracy?: number | null;
  ui_lang: string;
  reporter?: { name?: string | null; phone?: string | null } | null;
}

export interface ReportResult {
  ticket_code: string;
  incident_id: string;
  merged: boolean;
  report_number: number;
  category: Category;
  severity: number;
  department: string | null;
  summary: { en: string; or: string; hi: string };
  track_url: string;
}

/** §12.3 fallback — keep the report and flag it for admin review rather than losing it. */
function fallbackTriage(description: string): TriageOutput {
  return {
    is_valid: true,
    category: "other",
    severity: 3,
    severity_reason: "AI unavailable — pending manual review",
    risk_to_life: false,
    near_sensitive_site: false,
    title_en: description.slice(0, 60) || "Civic issue reported",
    summary_en: description.slice(0, 200) || "Citizen report awaiting review.",
    summary_or: "",
    summary_hi: "",
    visible_details: [],
    confidence: 0,
  };
}

/** Orchestrates §8.1: STT → triage → geocode → dedupe → insert/merge. */
export async function processReport(input: ReportInput): Promise<ReportResult> {
  const [photo, audio] = await Promise.all([
    input.photo_path ? downloadMedia(input.photo_path) : undefined,
    input.audio_path ? downloadMedia(input.audio_path) : undefined,
  ]);

  // Step A — speech to text (non-fatal: photo/text may still carry the report)
  let transcript: { transcript: string; lang: string; transcript_en: string } | null = null;
  if (audio) {
    try {
      transcript = await ai.transcribe(audio);
    } catch (err) {
      console.warn("Transcription failed", err);
    }
  }
  const description = [transcript?.transcript_en, input.text].filter(Boolean).join(" — ").trim();
  if (!photo && !description) {
    throw new ApiError(422, "INVALID_REPORT", "We couldn't understand the report. Please add a photo or a short description.");
  }

  const place = await reverseGeocode(input.lat, input.lng);

  // Step B — triage
  let triage: TriageOutput;
  let needsReview = false;
  try {
    triage = await ai.triage({
      image: photo,
      description,
      lang: transcript?.lang ?? input.ui_lang,
      locality: place.locality,
    });
  } catch (err) {
    console.warn("Triage failed — using fallback", err);
    triage = fallbackTriage(description);
    needsReview = true;
  }

  const severity = adjustSeverity(triage.severity, triage.risk_to_life, triage.near_sensitive_site);
  const reportRow = {
    photo_path: input.photo_path ?? null,
    audio_path: input.audio_path ?? null,
    text_input: input.text ?? null,
    transcript: transcript?.transcript ?? null,
    transcript_en: transcript?.transcript_en ?? null,
    detected_lang: transcript?.lang ?? input.ui_lang,
    lat: input.lat,
    lng: input.lng,
    gps_accuracy_m: input.accuracy ?? null,
    reporter_name: input.reporter?.name || null,
    reporter_phone: input.reporter?.phone || null,
    ai_raw: triage,
    is_valid: triage.is_valid,
  };

  if (!triage.is_valid) {
    // Persist as INVALID so an admin can restore it (§11), then tell the citizen.
    await createIncident({ triage, severity, input, place, photoPath: input.photo_path, reportRow, needsReview, invalid: true });
    throw new ApiError(422, "INVALID_REPORT", triage.invalid_reason || "Photo doesn't show a civic issue");
  }

  // Step C — dedupe
  const merged = await tryMerge(triage.category, severity, triage.risk_to_life, input, photo, reportRow);
  if (merged) return merged;

  return createIncident({ triage, severity, input, place, photoPath: input.photo_path, reportRow, needsReview, invalid: false });
}

/** §13 — attach to an existing nearby incident when it's the same problem. */
async function tryMerge(
  category: Category,
  sev: number,
  risk: boolean,
  inp: ReportInput,
  newPhoto: MediaRef | undefined,
  row: Record<string, unknown>,
): Promise<ReportResult | null> {
  const db = getAdminSupabase();
  const { data: candidates } = await db.rpc("find_duplicate_incident", {
    p_lat: inp.lat,
    p_lng: inp.lng,
    p_category: category,
    p_radius_m: dedupeRadius(category),
  });
  const best = (candidates as { id: string; distance_m: number; cover_photo_path: string | null }[] | null)?.[0];
  if (!best) return null;

  const bothHavePhotos = Boolean(newPhoto && best.cover_photo_path);
  let decision = decideDedupe({ distanceM: best.distance_m, bothHavePhotos });
  if (decision.action === "ask_ai" && newPhoto && best.cover_photo_path) {
    try {
      const existing = await downloadMedia(best.cover_photo_path);
      const verdict = await ai.compareSameIssue(existing, newPhoto, category, best.distance_m);
      decision = decideDedupe({ distanceM: best.distance_m, bothHavePhotos, aiResult: verdict });
    } catch {
      decision = decideDedupe({ distanceM: best.distance_m, bothHavePhotos: false });
    }
  }
  if (decision.action !== "merge") return null;

  const incident = await getIncident(best.id);
  const reportCount = incident.report_count + 1;
  const newSeverity = Math.max(incident.severity, sev);
  const riskToLife = incident.risk_to_life || risk;

  await db.from("reports").insert({ ...row, incident_id: incident.id });
  await db
    .from("incidents")
    .update({
      report_count: reportCount,
      severity: newSeverity,
      risk_to_life: riskToLife,
      cover_photo_path: incident.cover_photo_path ?? inp.photo_path ?? null,
      priority_score: computePriority({
        ...incident,
        report_count: reportCount,
        severity: newSeverity,
        risk_to_life: riskToLife,
      }),
    })
    .eq("id", incident.id);
  await logStatus(incident.id, incident.status, incident.status, "system", `Duplicate merged (#${reportCount})`);

  const { data: dept } = await db
    .from("departments")
    .select("name")
    .eq("id", incident.department_id)
    .maybeSingle<{ name: string }>();
  return {
    ticket_code: incident.ticket_code,
    incident_id: incident.id,
    merged: true,
    report_number: reportCount,
    category: incident.category,
    severity: newSeverity,
    department: dept?.name ?? null,
    summary: { en: incident.summary_en ?? "", or: incident.summary_or ?? "", hi: incident.summary_hi ?? "" },
    track_url: `/track/${incident.ticket_code}`,
  };
}

async function createIncident(a: {
  triage: TriageOutput;
  severity: number;
  input: ReportInput;
  place: { locality: string | null; ward: string | null };
  photoPath: string | null | undefined;
  reportRow: Record<string, unknown>;
  needsReview: boolean;
  invalid: boolean;
}): Promise<ReportResult> {
  const db = getAdminSupabase();
  const env = serverEnv();
  const { triage, severity, input, place } = a;

  // Low-confidence classifications go to the admin desk for manual routing (§26).
  const lowConfidence = triage.confidence < LOW_CONFIDENCE_ROUTE_THRESHOLD;
  let dept: Department | null = await departmentForCategory(lowConfidence ? "other" : triage.category);
  if (lowConfidence && dept?.code !== ADMIN_DESK_CODE) dept = await departmentForCategory("other");

  const now = new Date();
  const status = a.invalid ? "invalid" : "open";
  const base = {
    category: triage.category,
    severity,
    severity_reason: triage.severity_reason,
    department_id: dept?.id ?? null,
    status,
    lat: input.lat,
    lng: input.lng,
    locality: place.locality,
    ward: place.ward,
    title_en: triage.title_en,
    summary_en: triage.summary_en,
    summary_or: triage.summary_or,
    summary_hi: triage.summary_hi,
    risk_to_life: triage.risk_to_life,
    ai_confidence: triage.confidence,
    needs_review: a.needsReview || lowConfidence,
    cover_photo_path: a.photoPath ?? null,
    report_count: 1,
    sla_due_at: dept ? slaDueAt(now, dept.sla_hours, severity).toISOString() : null,
    priority_score: computePriority({ severity, report_count: 1, risk_to_life: triage.risk_to_life, created_at: now, status }),
  };

  // Ticket codes are short; retry on the rare unique collision.
  let incident: { id: string; ticket_code: string } | null = null;
  for (let attempt = 0; attempt < 5 && !incident; attempt++) {
    const { data, error } = await db
      .from("incidents")
      .insert({ ...base, ticket_code: generateTicketCode(env.CITY_CODE) })
      .select("id, ticket_code")
      .single<{ id: string; ticket_code: string }>();
    if (data) incident = data;
    else if (error && error.code !== "23505") throw new ApiError(500, "DB_ERROR", "Could not save the report");
  }
  if (!incident) throw new ApiError(500, "DB_ERROR", "Could not allocate a ticket code");

  await db.from("reports").insert({ ...a.reportRow, incident_id: incident.id });
  await logStatus(
    incident.id,
    null,
    status,
    a.invalid ? "ai" : "system",
    a.invalid ? `Flagged invalid: ${triage.invalid_reason ?? "not a civic issue"}` : "Incident created",
  );

  if (!a.invalid && dept) {
    const ticket = incident.ticket_code;
    const incidentId = incident.id;
    const department = dept;
    // Complaint letter + Telegram alert run after the response is sent (§12.7, FR-4.4).
    after(async () => {
      try {
        const letter = await ai.complaintLetter(
          letterPrompt({
            department: department.name,
            summary: triage.summary_en,
            locality: place.locality,
            lat: input.lat,
            lng: input.lng,
            reportCount: 1,
            ticket,
          }),
        );
        await db.from("incidents").update({ complaint_letter: letter }).eq("id", incidentId);
      } catch (err) {
        console.warn("Complaint letter failed", err);
      }
      if (severity >= 4) {
        await notifyDepartment(
          department.telegram_chat_id,
          `🚨 NagarNetra ${ticket} — severity ${severity}\n${triage.title_en}\n${place.locality ?? ""}\n${process.env.NEXT_PUBLIC_APP_URL ?? ""}/track/${ticket}`,
        );
      }
    });
  }

  return {
    ticket_code: incident.ticket_code,
    incident_id: incident.id,
    merged: false,
    report_number: 1,
    category: triage.category,
    severity,
    department: dept?.name ?? null,
    summary: { en: triage.summary_en, or: triage.summary_or, hi: triage.summary_hi },
    track_url: `/track/${incident.ticket_code}`,
  };
}
