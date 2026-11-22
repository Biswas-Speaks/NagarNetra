import "server-only";
import { ai, type VerifyOutput } from "./ai";
import { ApiError } from "./api";
import { RESOLVE_MAX_DISTANCE_M, VERIFY_MIN_CONFIDENCE } from "./constants";
import { haversineMeters } from "./geo";
import { transition } from "./incidents";
import { RESOLVABLE } from "./status";
import { downloadMedia } from "./storage";
import { getAdminSupabase } from "./supabase/admin";
import type { IncidentRow } from "./types";

/** §12.6 acceptance rule. Pure for testing. */
export function isFixAccepted(v: Pick<VerifyOutput, "fixed" | "same_location" | "confidence">, distanceM: number | null) {
  return (
    v.fixed &&
    v.same_location &&
    v.confidence >= VERIFY_MIN_CONFIDENCE &&
    distanceM !== null &&
    distanceM <= RESOLVE_MAX_DISTANCE_M
  );
}

export async function verifyAndResolve(args: {
  incident: IncidentRow;
  afterPhotoPath: string;
  lat: number | null;
  lng: number | null;
  note: string | null;
  officerId: string;
  actorName: string;
}) {
  const { incident } = args;
  if (!RESOLVABLE.includes(incident.status)) {
    throw new ApiError(409, "NOT_RESOLVABLE", `Incident is ${incident.status}; it cannot be resolved now`);
  }

  const distanceM =
    args.lat !== null && args.lng !== null ? haversineMeters(incident.lat, incident.lng, args.lat, args.lng) : null;
  if (distanceM === null) throw new ApiError(400, "GPS_REQUIRED", "Location is required to resolve an incident");
  if (distanceM > RESOLVE_MAX_DISTANCE_M) {
    throw new ApiError(
      422,
      "TOO_FAR",
      `After-photo was taken ${Math.round(distanceM)} m away; it must be within ${RESOLVE_MAX_DISTANCE_M} m`,
    );
  }

  const after = await downloadMedia(args.afterPhotoPath);
  let verdict: VerifyOutput;
  if (incident.cover_photo_path) {
    const before = await downloadMedia(incident.cover_photo_path);
    try {
      verdict = await ai.verifyFix(before, after, incident.category, incident.summary_en ?? incident.title_en ?? "");
    } catch {
      throw new ApiError(503, "AI_UNAVAILABLE", "Fix verification is temporarily unavailable — please retry shortly");
    }
  } else {
    // No before-photo (voice/text-only report): can't compare, so an admin must confirm.
    verdict = {
      fixed: false,
      confidence: 0,
      same_location: false,
      reason: "No before-photo to compare; needs admin confirmation",
      remaining_issues: [],
    };
  }

  const accepted = isFixAccepted(verdict, distanceM);
  const status = accepted ? "resolved" : "closure_rejected";

  await getAdminSupabase().from("resolutions").insert({
    incident_id: incident.id,
    officer_id: args.officerId,
    after_photo_path: args.afterPhotoPath,
    lat: args.lat,
    lng: args.lng,
    distance_m: distanceM,
    note: args.note,
    ai_fixed: verdict.fixed,
    ai_confidence: verdict.confidence,
    ai_same_location: verdict.same_location,
    ai_reason: verdict.reason,
    remaining_issues: verdict.remaining_issues,
    accepted,
  });

  await transition(incident, status, "ai", `${args.actorName}: ${args.note ?? "resolve attempt"} — AI: ${verdict.reason}`);

  return { accepted, status, ai: verdict, distance_m: Math.round(distanceM * 10) / 10 };
}
