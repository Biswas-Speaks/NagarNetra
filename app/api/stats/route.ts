import { NextResponse } from "next/server";
import { handler } from "@/lib/api";
import { getStats } from "@/lib/public";
import { enforceRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

/** §16.5 — public transparency stats. */
export const GET = handler(async (req: Request) => {
  await enforceRateLimit(req, "read");
  return NextResponse.json(await getStats());
});
