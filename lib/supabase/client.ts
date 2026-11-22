"use client";

import { createBrowserClient } from "@supabase/ssr";
import { clientEnv } from "@/lib/env/client";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

/** Browser client — anon key only. Used for staff login and Realtime. */
export function getBrowserSupabase() {
  browserClient ??= createBrowserClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return browserClient;
}
