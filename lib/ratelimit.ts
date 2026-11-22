import "server-only";
import { ApiError, clientIp } from "./api";
import { getAdminSupabase } from "./supabase/admin";

export const LIMITS = {
  report: { windowS: 600, max: 5 },
  upload: { windowS: 600, max: 15 },
  read: { windowS: 60, max: 60 },
} as const;

/** §16.10 — Postgres-backed fixed window so limits hold across serverless instances. */
export async function enforceRateLimit(req: Request, bucket: keyof typeof LIMITS) {
  const { windowS, max } = LIMITS[bucket];
  const { data, error } = await getAdminSupabase().rpc("hit_rate_limit", {
    p_key: `${bucket}:${clientIp(req)}`,
    p_window_s: windowS,
    p_max: max,
  });
  // Fail open on DB errors: availability beats strictness for a civic intake form.
  if (!error && data === false) {
    throw new ApiError(429, "RATE_LIMITED", "Too many requests — please wait a few minutes and try again");
  }
}
