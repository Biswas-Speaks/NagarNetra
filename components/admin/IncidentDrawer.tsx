"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { SeverityChip } from "@/components/incident/SeverityChip";
import { StatusPill } from "@/components/incident/StatusPill";
import { Timeline } from "@/components/incident/Timeline";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CATEGORIES, type IncidentStatus } from "@/lib/constants";
import type { Department } from "@/lib/types";
import { apiErrorMessage } from "@/lib/utils";
import { ResolvePanel } from "./ResolvePanel";
import type { AdminDetail } from "./types";

/** §17.7 — reports, AI output, complaint letter and officer actions. */
export function IncidentDrawer({
  id,
  departments,
  onClose,
  onChanged,
}: {
  id: string;
  departments: Department[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<AdminDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [override, setOverride] = useState<{ category?: string; severity?: number; department_id?: string }>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/admin/incidents/${id}`);
    if (!res.ok) return setError(await apiErrorMessage(res));
    setDetail((await res.json()) as AdminDetail);
  }, [id]);

  useEffect(() => {
    setDetail(null);
    void load();
  }, [load]);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/incidents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) return setError(await apiErrorMessage(res));
    setNote("");
    setOverride({});
    await load();
    onChanged();
  }

  const setStatus = (status: IncidentStatus) => patch({ status, note: note || undefined });
  const i = detail?.incident;
  const isAdmin = detail?.me.role === "admin";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <aside className="h-full w-full max-w-2xl overflow-y-auto bg-white p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-mono text-lg font-bold">{i?.ticket_code ?? "…"}</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        {!detail || !i ? (
          <Spinner className="text-primary" />
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-lg font-semibold">{i.title_en}</p>
              <div className="flex flex-wrap gap-2">
                <SeverityChip severity={i.severity} />
                <StatusPill status={i.status} />
                <span className="text-sm text-slate-500">
                  {i.category} · {detail.department?.name ?? "Unrouted"} · priority {Number(i.priority_score).toFixed(0)}
                </span>
              </div>
              <p className="text-sm text-slate-700">{i.summary_en}</p>
              {i.severity_reason && <p className="text-xs text-slate-500">Severity: {i.severity_reason}</p>}
              {i.needs_review && (
                <p className="text-xs font-semibold text-amber-700">
                  ⚠ Needs manual review (low AI confidence or AI unavailable)
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2 rounded-xl bg-slate-50 p-3">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (e.g. Team dispatched)"
                maxLength={500}
                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                {i.status === "open" && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus("acknowledged")}>
                    Acknowledge
                  </Button>
                )}
                {["open", "acknowledged", "closure_rejected", "reopened"].includes(i.status) && (
                  <Button size="sm" disabled={busy} onClick={() => setStatus("in_progress")}>
                    Mark in progress
                  </Button>
                )}
                {isAdmin && i.status !== "resolved" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || !note}
                    onClick={() => setStatus("resolved")}
                    title="Requires a note"
                  >
                    Manual resolve
                  </Button>
                )}
                {isAdmin && i.status !== "invalid" && (
                  <Button size="sm" variant="danger" disabled={busy} onClick={() => setStatus("invalid")}>
                    Mark invalid
                  </Button>
                )}
                {isAdmin && i.status === "invalid" && (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus("open")}>
                    Restore
                  </Button>
                )}
              </div>
            </div>

            {i.status !== "resolved" && i.status !== "invalid" && (
              <ResolvePanel
                incidentId={i.id}
                onDone={() => {
                  void load();
                  onChanged();
                }}
              />
            )}

            {isAdmin && (
              <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-semibold">Override AI (admin)</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <select
                    value={override.category ?? ""}
                    onChange={(e) => setOverride({ ...override, category: e.target.value || undefined })}
                    className="h-10 rounded-lg border border-slate-300 px-2 text-sm"
                  >
                    <option value="">Category…</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select
                    value={override.severity ?? ""}
                    onChange={(e) => setOverride({ ...override, severity: e.target.value ? Number(e.target.value) : undefined })}
                    className="h-10 rounded-lg border border-slate-300 px-2 text-sm"
                  >
                    <option value="">Severity…</option>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <select
                    value={override.department_id ?? ""}
                    onChange={(e) => setOverride({ ...override, department_id: e.target.value || undefined })}
                    className="h-10 rounded-lg border border-slate-300 px-2 text-sm"
                  >
                    <option value="">Department…</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.code}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || !note || !Object.keys(override).length}
                  onClick={() => patch({ override, note })}
                >
                  Apply override (note required)
                </Button>
              </div>
            )}

            {i.complaint_letter && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Complaint letter</p>
                  <button
                    className="text-sm text-primary"
                    onClick={() => navigator.clipboard.writeText(i.complaint_letter ?? "")}
                  >
                    Copy
                  </button>
                </div>
                <p className="rounded-lg bg-slate-50 p-3 text-sm whitespace-pre-wrap">{i.complaint_letter}</p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-semibold">Reports ({detail.reports.length})</p>
              {detail.reports.map((r) => (
                <div key={r.id} className="space-y-2 rounded-xl border border-slate-200 p-3 text-sm">
                  {r.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element -- signed URL
                    <img src={r.photo_url} alt="" className="max-h-64 w-full rounded-lg object-cover" />
                  )}
                  {r.audio_url && <audio src={r.audio_url} controls className="w-full" />}
                  {r.transcript && (
                    <p>
                      <b>Transcript ({r.detected_lang}):</b> {r.transcript}
                    </p>
                  )}
                  {r.transcript_en && r.transcript_en !== r.transcript && (
                    <p>
                      <b>English:</b> {r.transcript_en}
                    </p>
                  )}
                  {r.text_input && (
                    <p>
                      <b>Text:</b> {r.text_input}
                    </p>
                  )}
                  {(r.reporter_name || r.reporter_phone) && (
                    <p className="text-slate-500">
                      Reporter: {r.reporter_name} {r.reporter_phone}
                    </p>
                  )}
                  {!!r.ai_raw && (
                    <details>
                      <summary className="cursor-pointer text-xs text-slate-500">AI JSON</summary>
                      <pre className="mt-1 overflow-x-auto rounded bg-slate-900 p-2 text-xs text-slate-100">
                        {JSON.stringify(r.ai_raw, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>

            {!!detail.resolutions.length && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Resolution attempts</p>
                {detail.resolutions.map((r) => (
                  <div
                    key={r.id}
                    className={`rounded-xl border-2 p-3 text-sm ${r.accepted ? "border-green-400" : "border-red-400"}`}
                  >
                    {r.after_url && (
                      // eslint-disable-next-line @next/next/no-img-element -- signed URL
                      <img src={r.after_url} alt="" className="mb-2 max-h-48 w-full rounded-lg object-cover" />
                    )}
                    <p>
                      {r.accepted ? "✅ Accepted" : "❌ Rejected"} · {Math.round(Number(r.ai_confidence ?? 0) * 100)}% ·{" "}
                      {Math.round(r.distance_m ?? 0)} m
                    </p>
                    <p className="text-slate-600">{r.ai_reason}</p>
                  </div>
                ))}
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-semibold">Timeline</p>
              <Timeline entries={detail.timeline} />
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
