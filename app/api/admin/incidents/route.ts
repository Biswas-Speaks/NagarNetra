import { NextResponse } from "next/server";
import { z } from "zod";
import { handler } from "@/lib/api";
import { requireStaff } from "@/lib/auth";
import { ACTIVE_STATUSES, STATUSES } from "@/lib/constants";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const Query = z.object({
  status: z
    .string()
    .transform((s) => s.split(",").filter(Boolean))
    .pipe(z.array(z.enum(STATUSES)))
    .optional(),
  dept: z.uuid().optional(),
  review: z.enum(["1"]).optional(),
});

/** Officer queue (§17.7): own department for officers, everything for admins. */
export const GET = handler(async (req: Request) => {
  const staff = await requireStaff();
  const q = Query.parse(Object.fromEntries(new URL(req.url).searchParams));

  let query = getAdminSupabase()
    .from("incidents")
    .select(
      "id, ticket_code, title_en, category, severity, priority_score, status, report_count, locality, created_at, sla_due_at, needs_review, department_id, departments(name, code)",
    )
    .in("status", q.status?.length ? q.status : ACTIVE_STATUSES)
    .order("priority_score", { ascending: false })
    .limit(300);

  if (staff.role !== "admin") query = query.eq("department_id", staff.department_id ?? "00000000-0000-0000-0000-000000000000");
  else if (q.dept) query = query.eq("department_id", q.dept);
  if (q.review) query = query.eq("needs_review", true);

  const { data, error } = await query;
  if (error) throw error;
  return NextResponse.json({
    incidents: data ?? [],
    me: { role: staff.role, department_id: staff.department_id, name: staff.full_name },
  });
});
