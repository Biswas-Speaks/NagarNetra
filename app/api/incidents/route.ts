import { NextResponse } from "next/server";
import { z } from "zod";
import { handler } from "@/lib/api";
import { CATEGORIES, STATUSES } from "@/lib/constants";
import { parseBBox } from "@/lib/geo";
import { enforceRateLimit } from "@/lib/ratelimit";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const csv = <T extends string>(values: readonly [T, ...T[]]) =>
  z
    .string()
    .transform((s) => s.split(",").filter(Boolean))
    .pipe(z.array(z.enum(values)));

const Query = z.object({
  status: csv(STATUSES).optional(),
  category: csv(CATEGORIES).optional(),
  severity_min: z.coerce.number().int().min(1).max(5).optional(),
  dept: z.string().max(40).optional(),
  bbox: z.string().optional(),
  since: z.iso.datetime({ offset: true }).or(z.iso.date()).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(500),
});

/** §16.3 — public incident list (PII-free view). */
export const GET = handler(async (req: Request) => {
  await enforceRateLimit(req, "read");
  const q = Query.parse(Object.fromEntries(new URL(req.url).searchParams));

  let query = getAdminSupabase()
    .from("public_incidents")
    .select("*")
    .order("priority_score", { ascending: false })
    .limit(q.limit);

  if (q.status?.length) query = query.in("status", q.status);
  if (q.category?.length) query = query.in("category", q.category);
  if (q.severity_min) query = query.gte("severity", q.severity_min);
  if (q.dept) query = query.eq("department_code", q.dept);
  if (q.since) query = query.gte("created_at", q.since);
  if (q.bbox) {
    const [minLng, minLat, maxLng, maxLat] = parseBBox(q.bbox);
    query = query.gte("lng", minLng).lte("lng", maxLng).gte("lat", minLat).lte("lat", maxLat);
  }

  const { data, error } = await query;
  if (error) throw error;
  return NextResponse.json({ incidents: data ?? [] });
});
