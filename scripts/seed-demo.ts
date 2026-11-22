/**
 * Creates the 3 demo staff accounts (§23) and links them to departments.
 * Run AFTER supabase/schema.sql, policies.sql and seed.sql:
 *
 *   npm run seed:demo
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Set DEMO_PASSWORD to choose the password; otherwise a random one is printed.
 */
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const password = process.env.DEMO_PASSWORD || randomBytes(9).toString("base64url");

const ACCOUNTS = [
  { email: "roads@nagarnetra.demo", full_name: "Er. Das (BMC Roads)", role: "officer", dept: "BMC_ROADS" },
  { email: "water@nagarnetra.demo", full_name: "Water Supply Officer", role: "officer", dept: "WATER" },
  { email: "admin@nagarnetra.demo", full_name: "Command Centre Admin", role: "admin", dept: null },
] as const;

async function findUserId(email: string): Promise<string | null> {
  for (let page = 1; page < 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  const { data: depts, error } = await db.from("departments").select("id, code");
  if (error) throw error;
  if (!depts?.length) throw new Error("No departments found — run supabase/seed.sql first");
  const deptId = (code: string | null) => depts.find((d) => d.code === code)?.id ?? null;

  for (const acc of ACCOUNTS) {
    let id = await findUserId(acc.email);
    if (id) {
      await db.auth.admin.updateUserById(id, { password });
    } else {
      const { data, error: createErr } = await db.auth.admin.createUser({ email: acc.email, password, email_confirm: true });
      if (createErr) throw createErr;
      id = data.user.id;
    }
    const { error: profileErr } = await db
      .from("profiles")
      .upsert({ id, full_name: acc.full_name, role: acc.role, department_id: deptId(acc.dept) });
    if (profileErr) throw profileErr;
    console.log(`✔ ${acc.email} (${acc.role}${acc.dept ? `, ${acc.dept}` : ""})`);
  }

  console.log(`\nDemo password: ${password}\nSign in at /admin/login`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
