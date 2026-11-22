import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handler, parseBody } from "@/lib/api";
import { assertCanManage, requireStaff, staffActorName } from "@/lib/auth";
import { CATEGORIES } from "@/lib/constants";
import { departmentById, getIncident, logStatus, transition } from "@/lib/incidents";
import { computePriority, slaDueAt } from "@/lib/priority";
import { canTransition } from "@/lib/status";
import { signedReadUrls } from "@/lib/storage";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Full incident for the officer drawer — includes reporter details (staff only). */
export const GET = handler(async (_req: Request, ctx: Ctx) => {
  const staff = await requireStaff();
  const { id } = await ctx.params;
  const incident = await getIncident(id);
  assertCanManage(staff, incident.department_id);

  const db = getAdminSupabase();
  const [{ data: reports }, { data: resolutions }, { data: timeline }, department] = await Promise.all([
    db.from("reports").select("*").eq("incident_id", id).order("created_at", { ascending: true }),
    db.from("resolutions").select("*").eq("incident_id", id).order("created_at", { ascending: false }),
    db.from("status_log").select("*").eq("incident_id", id).order("created_at", { ascending: true }),
    departmentById(incident.department_id),
  ]);

  const paths = [
    ...(reports ?? []).flatMap((r) => [r.photo_path, r.audio_path]),
    ...(resolutions ?? []).map((r) => r.after_photo_path),
  ].filter((p): p is string => Boolean(p));
  const urls = await signedReadUrls(paths);
  const sign = (p: string | null) => (p ? (urls.get(p) ?? null) : null);

  return NextResponse.json({
    incident,
    department,
    reports: (reports ?? []).map((r) => ({ ...r, photo_url: sign(r.photo_path), audio_url: sign(r.audio_path) })),
    resolutions: (resolutions ?? []).map((r) => ({ ...r, after_url: sign(r.after_photo_path) })),
    timeline: timeline ?? [],
    me: { role: staff.role },
  });
});

const Patch = z
  .object({
    status: z.enum(["acknowledged", "in_progress", "resolved", "invalid", "open"]).optional(),
    note: z.string().trim().max(500).optional(),
    override: z
      .object({
        category: z.enum(CATEGORIES).optional(),
        severity: z.number().int().min(1).max(5).optional(),
        department_id: z.uuid().optional(),
      })
      .optional(),
  })
  .refine((b) => b.status || b.override, { message: "Nothing to update" });

/** §16.6 — status change (officer/admin) and AI overrides (admin only, logged). */
export const PATCH = handler(async (req: Request, ctx: Ctx) => {
  const staff = await requireStaff();
  const { id } = await ctx.params;
  const body = await parseBody(req, Patch);
  const incident = await getIncident(id);
  assertCanManage(staff, incident.department_id);
  const actor = staffActorName(staff);
  const isAdmin = staff.role === "admin";

  if (body.override) {
    if (!isAdmin) throw new ApiError(403, "ADMIN_ONLY", "Only admins can override AI decisions");
    if (!body.note) throw new ApiError(400, "NOTE_REQUIRED", "A note is required for overrides");
    const o = body.override;
    const patch: Record<string, unknown> = { needs_review: false };
    if (o.category) patch.category = o.category;
    if (o.severity) patch.severity = o.severity;
    if (o.department_id) {
      const dept = await departmentById(o.department_id);
      if (!dept) throw new ApiError(400, "BAD_DEPARTMENT", "Unknown department");
      patch.department_id = dept.id;
      patch.sla_due_at = slaDueAt(new Date(incident.created_at), dept.sla_hours, o.severity ?? incident.severity).toISOString();
    }
    patch.priority_score = computePriority({ ...incident, severity: o.severity ?? incident.severity });
    await getAdminSupabase().from("incidents").update(patch).eq("id", id);
    await logStatus(id, incident.status, incident.status, actor, `Override: ${JSON.stringify(o)} — ${body.note}`);
  }

  if (body.status && body.status !== incident.status) {
    const role = isAdmin ? "admin" : "officer";
    if (!canTransition(incident.status, body.status, role)) {
      throw new ApiError(409, "BAD_TRANSITION", `Cannot move from ${incident.status} to ${body.status}`);
    }
    // Resolving without AI verification is an admin override and must be justified (FR-5.5).
    if (body.status === "resolved" && !body.note)
      throw new ApiError(400, "NOTE_REQUIRED", "A note is required for manual resolution");
    const fresh = body.override ? await getIncident(id) : incident;
    await transition(fresh, body.status, actor, body.note);
  }

  return NextResponse.json({ incident: await getIncident(id) });
});
