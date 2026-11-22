import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, parseBody } from "@/lib/api";
import { assertCanManage, requireStaff, staffActorName } from "@/lib/auth";
import { getIncident } from "@/lib/incidents";
import { verifyAndResolve } from "@/lib/resolve";
import { assertSafePath } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  after_photo_path: z.string(),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  note: z.string().trim().max(500).nullish(),
});

/** §16.7 — resolve with an after-photo; AI decides RESOLVED vs CLOSURE_REJECTED. */
export const POST = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const staff = await requireStaff();
  const { id } = await ctx.params;
  const body = await parseBody(req, Body);
  assertSafePath(body.after_photo_path, "resolution");

  const incident = await getIncident(id);
  assertCanManage(staff, incident.department_id);

  const result = await verifyAndResolve({
    incident,
    afterPhotoPath: body.after_photo_path,
    lat: body.lat,
    lng: body.lng,
    note: body.note ?? null,
    officerId: staff.id,
    actorName: staffActorName(staff),
  });
  return NextResponse.json(result);
});
