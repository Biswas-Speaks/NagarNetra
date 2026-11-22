import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handler, parseBody } from "@/lib/api";
import { getIncident, transition } from "@/lib/incidents";
import { canReopen } from "@/lib/public";
import { enforceRateLimit } from "@/lib/ratelimit";
import { assertSafePath, downloadMedia } from "@/lib/storage";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const Body = z.object({
  ticket_code: z.string().trim().toUpperCase(),
  photo_path: z.string(),
  note: z.string().trim().max(300).optional(),
});

/** §16.8 — citizen reopens a resolved incident within 7 days, with a new photo. */
export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await enforceRateLimit(req, "report");
  const { id } = await ctx.params;
  const body = await parseBody(req, Body);
  assertSafePath(body.photo_path, "report");

  const incident = await getIncident(id);
  if (incident.ticket_code !== body.ticket_code) throw new ApiError(403, "TICKET_MISMATCH", "Ticket code does not match");
  if (!canReopen(incident))
    throw new ApiError(409, "NOT_REOPENABLE", "Only incidents resolved in the last 7 days can be reopened");
  await downloadMedia(body.photo_path); // confirms the upload exists

  await getAdminSupabase()
    .from("reports")
    .insert({
      incident_id: incident.id,
      photo_path: body.photo_path,
      text_input: body.note ?? "Citizen reopened: issue persists",
      lat: incident.lat,
      lng: incident.lng,
    });
  await transition(incident, "reopened", "citizen", body.note ?? "Citizen reports the issue persists", {
    report_count: incident.report_count + 1,
  });

  return NextResponse.json({ status: "reopened" });
});
