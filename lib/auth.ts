import "server-only";
import { ApiError } from "./api";
import { getAdminSupabase } from "./supabase/admin";
import { getServerSupabase } from "./supabase/server";
import type { StaffProfile } from "./types";

/** Resolves the signed-in officer/admin or throws 401/403. */
export async function requireStaff(): Promise<StaffProfile & { email: string | undefined }> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new ApiError(401, "UNAUTHENTICATED", "Please sign in");

  const { data: profile } = await getAdminSupabase()
    .from("profiles")
    .select("id, full_name, role, department_id")
    .eq("id", data.user.id)
    .maybeSingle<StaffProfile>();
  if (!profile) throw new ApiError(403, "NOT_STAFF", "This account is not registered as an officer");

  return { ...profile, email: data.user.email };
}

export function assertCanManage(staff: StaffProfile, departmentId: string | null) {
  if (staff.role === "admin") return;
  if (!departmentId || staff.department_id !== departmentId) {
    throw new ApiError(403, "FORBIDDEN", "This incident belongs to another department");
  }
}

export function staffActorName(staff: StaffProfile & { email?: string }) {
  return staff.full_name || staff.email || (staff.role === "admin" ? "admin" : "officer");
}
