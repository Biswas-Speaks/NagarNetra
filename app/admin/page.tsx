"use client";

import { useCallback, useEffect, useState } from "react";
import { IncidentDrawer } from "@/components/admin/IncidentDrawer";
import type { QueueRow } from "@/components/admin/types";
import { SeverityChip } from "@/components/incident/SeverityChip";
import { StatusPill } from "@/components/incident/StatusPill";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { STATUSES } from "@/lib/constants";
import type { Department } from "@/lib/types";
import { apiErrorMessage, cn, hoursBetween } from "@/lib/utils";

/** §17.7 — priority-sorted officer queue. */
export default function AdminQueuePage() {
  const [rows, setRows] = useState<QueueRow[] | null>(null);
  const [me, setMe] = useState<{ role: string; name: string | null } | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [status, setStatus] = useState("");
  const [dept, setDept] = useState("");
  const [review, setReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    if (dept) qs.set("dept", dept);
    if (review) qs.set("review", "1");
    const res = await fetch(`/api/admin/incidents?${qs}`);
    if (!res.ok) return setError(await apiErrorMessage(res));
    const body = (await res.json()) as { incidents: QueueRow[]; me: { role: string; name: string | null } };
    setRows(body.incidents);
    setMe(body.me);
  }, [status, dept, review]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetch("/api/admin/departments")
      .then((r) => (r.ok ? r.json() : { departments: [] }))
      .then((b: { departments: Department[] }) => setDepartments(b.departments));
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm"
        >
          <option value="">Active statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {me?.role === "admin" && (
          <select
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} /> Needs review
        </label>
        {me && <span className="ml-auto text-sm text-slate-500">{me.name ?? me.role}</span>}
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <Card className="overflow-x-auto p-0">
        {!rows ? (
          <div className="p-6">
            <Spinner className="text-primary" />
          </div>
        ) : (
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="p-3">Ticket</th>
                <th className="p-3">Title</th>
                <th className="p-3">Severity</th>
                <th className="p-3 text-right">Reports</th>
                <th className="p-3 text-right">Age</th>
                <th className="p-3">SLA</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const slaLeft = r.sla_due_at ? hoursBetween(new Date(), r.sla_due_at) : null;
                return (
                  <tr key={r.id} onClick={() => setSelected(r.id)} className="cursor-pointer border-t hover:bg-blue-50">
                    <td className="p-3 font-mono text-xs">{r.ticket_code}</td>
                    <td className="p-3">
                      <p className="font-medium">
                        {r.needs_review && <span title="Needs review">⚠ </span>}
                        {r.title_en}
                      </p>
                      <p className="text-xs text-slate-500">
                        {r.locality} · {r.departments?.code}
                      </p>
                    </td>
                    <td className="p-3">
                      <SeverityChip severity={r.severity} />
                    </td>
                    <td className="p-3 text-right tabular-nums">{r.report_count}</td>
                    <td className="p-3 text-right tabular-nums">{Math.round(hoursBetween(r.created_at))}h</td>
                    <td className={cn("p-3 tabular-nums", slaLeft !== null && slaLeft < 0 && "font-semibold text-red-700")}>
                      {slaLeft === null ? "—" : slaLeft < 0 ? `${Math.round(-slaLeft)}h over` : `${Math.round(slaLeft)}h left`}
                    </td>
                    <td className="p-3">
                      <StatusPill status={r.status} />
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    No incidents in this view 🎉
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>

      {selected && <IncidentDrawer id={selected} departments={departments} onClose={() => setSelected(null)} onChanged={load} />}
    </div>
  );
}
