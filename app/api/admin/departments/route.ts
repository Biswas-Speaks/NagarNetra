import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handler, parseBody } from "@/lib/api";
import { requireStaff } from "@/lib/auth";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export const GET = handler(async () => {
  await requireStaff();
  const { data, error } = await getAdminSupabase().from("departments").select("*").order("code");
  if (error) throw error;
  return NextResponse.json({ departments: data ?? [] });
});

const Patch = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2).max(120).optional(),
  name_or: z.string().trim().max(120).nullable().optional(),
  sla_hours: z
    .number()
    .int()
    .min(1)
    .max(24 * 30)
    .optional(),
  telegram_chat_id: z.string().trim().max(40).nullable().optional(),
});

/** Admin-only department management (§17.7). */
export const PATCH = handler(async (req: Request) => {
  const staff = await requireStaff();
  if (staff.role !== "admin") throw new ApiError(403, "ADMIN_ONLY", "Only admins can edit departments");
  const { id, ...patch } = await parseBody(req, Patch);
  const { data, error } = await getAdminSupabase().from("departments").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return NextResponse.json({ department: data });
});
