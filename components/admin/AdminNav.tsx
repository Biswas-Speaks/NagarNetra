"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/admin/login") return null;

  async function signOut() {
    await getBrowserSupabase().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={cn(
        "rounded-lg px-3 py-2 text-sm font-medium",
        pathname === href ? "bg-primary text-white" : "hover:bg-slate-100",
      )}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
      <span className="px-2 text-sm font-bold text-slate-700">Officer console</span>
      {link("/admin", "Queue")}
      {link("/admin/departments", "Departments")}
      <button onClick={signOut} className="ml-auto rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">
        Sign out
      </button>
    </div>
  );
}
