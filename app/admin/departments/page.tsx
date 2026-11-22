"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Department } from "@/lib/types";
import { apiErrorMessage } from "@/lib/utils";

/** Admin-only department management: names, SLA hours, Telegram chat. */
export default function DepartmentsPage() {
  const [rows, setRows] = useState<Department[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/admin/departments")
      .then((r) => r.json())
      .then((b: { departments: Department[] }) => setRows(b.departments ?? []));
  }, []);

  const update = (id: string, patch: Partial<Department>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  async function save(d: Department) {
    setMsg(null);
    const res = await fetch("/api/admin/departments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: d.id,
        name: d.name,
        name_or: d.name_or,
        sla_hours: d.sla_hours,
        telegram_chat_id: d.telegram_chat_id || null,
      }),
    });
    setMsg(res.ok ? `Saved ${d.code}` : await apiErrorMessage(res));
  }

  return (
    <div className="space-y-3">
      {msg && <p className="rounded-lg bg-slate-100 p-2 text-sm">{msg}</p>}
      {rows.map((d) => (
        <Card key={d.id} className="grid items-end gap-2 sm:grid-cols-[110px_1fr_1fr_90px_140px_auto]">
          <span className="font-mono text-sm font-bold">{d.code}</span>
          <label className="text-xs text-slate-500">
            Name
            <input
              value={d.name}
              onChange={(e) => update(d.id, { name: e.target.value })}
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-2 text-sm text-slate-900"
            />
          </label>
          <label className="text-xs text-slate-500">
            Odia name
            <input
              value={d.name_or ?? ""}
              onChange={(e) => update(d.id, { name_or: e.target.value })}
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-2 text-sm text-slate-900"
            />
          </label>
          <label className="text-xs text-slate-500">
            SLA (h)
            <input
              type="number"
              min={1}
              value={d.sla_hours}
              onChange={(e) => update(d.id, { sla_hours: Number(e.target.value) })}
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-2 text-sm text-slate-900"
            />
          </label>
          <label className="text-xs text-slate-500">
            Telegram chat id
            <input
              value={d.telegram_chat_id ?? ""}
              onChange={(e) => update(d.id, { telegram_chat_id: e.target.value })}
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-2 text-sm text-slate-900"
            />
          </label>
          <Button size="sm" onClick={() => save(d)}>
            Save
          </Button>
        </Card>
      ))}
    </div>
  );
}
