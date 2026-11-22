import { NextResponse } from "next/server";
import { ApiError, handler } from "@/lib/api";
import { serverEnv } from "@/lib/env/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** §16.9 — daily: recompute priorities, prune rate-limit rows, keep Supabase awake. */
export const GET = handler(async (req: Request) => {
  const secret = serverEnv().CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    throw new ApiError(401, "UNAUTHORIZED", "Invalid cron secret");
  }

  const db = getAdminSupabase();
  const { data: updated, error } = await db.rpc("recompute_priorities");
  if (error) throw error;

  const { count: slaBreached } = await db
    .from("incidents")
    .select("id", { count: "exact", head: true })
    .not("status", "in", "(resolved,invalid)")
    .lt("sla_due_at", new Date().toISOString());

  return NextResponse.json({ ok: true, recomputed: updated, sla_breached: slaBreached ?? 0 });
});
