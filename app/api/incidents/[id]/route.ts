import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { getIncidentDetail } from "@/lib/public";
import { enforceRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

/** §16.4 — public incident detail by UUID or ticket code. */
export const GET = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await enforceRateLimit(req, "read");
  const { id } = await ctx.params;
  return NextResponse.json(await getIncidentDetail(id));
});
