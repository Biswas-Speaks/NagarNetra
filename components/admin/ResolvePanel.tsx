"use client";

import { useRef, useState } from "react";
import { AIVerdict, type Verdict } from "@/components/incident/AIVerdict";
import { Button } from "@/components/ui/button";
import { compressImage, getPosition, uploadFiles } from "@/lib/upload";
import { apiErrorMessage } from "@/lib/utils";

/** §FR-5.2–5.4 — after-photo with GPS → instant AI verdict. */
export function ResolvePanel({ incidentId, onDone }: { incidentId: string; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setVerdict(null);
    try {
      setBusy("Getting GPS…");
      const pos = await getPosition().catch(() => null);
      setBusy("Uploading photo…");
      const { after } = await uploadFiles([{ kind: "after", blob: await compressImage(file) }]);
      setBusy("AI is verifying the fix…");
      const res = await fetch(`/api/admin/incidents/${incidentId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          after_photo_path: after,
          lat: pos?.coords.latitude ?? null,
          lng: pos?.coords.longitude ?? null,
          note: note || null,
        }),
      });
      if (!res.ok) throw new Error(await apiErrorMessage(res));
      const body = (await res.json()) as {
        accepted: boolean;
        ai: { confidence: number; reason: string; remaining_issues: string[] };
        distance_m: number;
      };
      setVerdict({
        accepted: body.accepted,
        confidence: body.ai.confidence,
        reason: body.ai.reason,
        remaining_issues: body.ai.remaining_issues,
        distance_m: body.distance_m,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-3">
      <p className="text-sm font-semibold">Resolve with after-photo</p>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (e.g. Patched with asphalt)"
        maxLength={500}
        className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm"
      />
      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      <Button variant="accent" className="w-full" onClick={() => fileRef.current?.click()} disabled={!!busy}>
        {busy ?? "📷 Take after-photo & resolve"}
      </Button>
      <p className="text-xs text-slate-500">Photo must be taken within 100 m of the incident. Location access is required.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {verdict && <AIVerdict verdict={verdict} />}
    </div>
  );
}
