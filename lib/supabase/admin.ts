import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { clientEnv } from "@/lib/env/client";
import { serverEnv } from "@/lib/env/server";

let adminClient: SupabaseClient | undefined;

/** Service-role client — bypasses RLS. Server only; never return its data unfiltered. */
export function getAdminSupabase(): SupabaseClient {
  adminClient ??= createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}
