"use client";

import { Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PinMap } from "@/components/map";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { CATEGORY_ICON } from "@/lib/constants";
import { useI18n, type MessageKey } from "@/lib/i18n";
import type { IncidentDetail } from "@/lib/types";
import { compressImage, uploadFiles } from "@/lib/upload";
import { apiErrorMessage, hoursBetween } from "@/lib/utils";
import { AIVerdict } from "./AIVerdict";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { SeverityChip } from "./SeverityChip";
import { StatusPill } from "./StatusPill";
import { Timeline } from "./Timeline";

/** §17.4 — public incident page shared by /track/[ticket] and /incident/[id]. */
export function IncidentView({ detail }: { detail: IncidentDetail }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const { incident: i, photos, latest_resolution: res, timeline } = detail;
  const fileRef = useRef<HTMLInputElement>(null);
  const [reopenMsg, setReopenMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const summary = (lang === "or" ? i.summary_or : lang === "hi" ? i.summary_hi : null) || i.summary_en;
  const slaHours = i.sla_due_at && i.status !== "resolved" ? Math.round(hoursBetween(new Date(), i.sla_due_at)) : null;

  async function reopen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setReopenMsg(null);
    try {
      const { photo } = await uploadFiles([{ kind: "photo", blob: await compressImage(file) }]);
      const r = await fetch(`/api/incidents/${i.id}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_code: i.ticket_code, photo_path: photo }),
      });
      if (!r.ok) throw new Error(await apiErrorMessage(r));
      setReopenMsg(t("track.reopened"));
      router.refresh();
    } catch (err) {
      setReopenMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const url = `${window.location.origin}/track/${i.ticket_code}`;
    if (navigator.share) await navigator.share({ title: i.title_en ?? i.ticket_code, url }).catch(() => undefined);
    else await navigator.clipboard.writeText(url).catch(() => undefined);
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold">
            <span aria-hidden>{CATEGORY_ICON[i.category]} </span>
            {i.title_en || t(`cat.${i.category}` as MessageKey)}
          </h1>
          <button onClick={share} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={t("result.share")}>
            <Share2 className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-slate-600">{i.ticket_code}</span>
          <SeverityChip severity={i.severity} />
          <StatusPill status={i.status} />
        </div>
        {summary && <p className="text-slate-700">{summary}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
          {i.department_name && (
            <span>
              {t("track.department")}: <b>{i.department_name}</b>
            </span>
          )}
          <span>{t("track.reports", { n: i.report_count })}</span>
          {slaHours !== null && (
            <span className={slaHours < 0 ? "font-semibold text-red-700" : ""}>
              {slaHours < 0 ? t("track.slaOverdue", { h: -slaHours }) : t("track.sla", { h: slaHours })}
            </span>
          )}
        </div>
      </Card>

      {photos.before && photos.after ? (
        <BeforeAfterSlider before={photos.before} after={photos.after} />
      ) : photos.before ? (
        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
        <img src={photos.before} alt={t("track.before")} className="aspect-[4/3] w-full rounded-2xl object-cover" />
      ) : null}

      {res && (
        <AIVerdict
          verdict={{
            accepted: res.accepted,
            confidence: res.ai_confidence,
            reason: res.ai_reason,
            remaining_issues: res.remaining_issues,
            distance_m: res.distance_m,
          }}
        />
      )}

      {detail.can_reopen && (
        <Card className="space-y-2">
          <p className="text-sm text-slate-600">{t("track.reopenHint")}</p>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={reopen} />
          <Button variant="accent" onClick={() => fileRef.current?.click()} disabled={busy} className="w-full">
            {busy ? t("common.loading") : t("track.reopen")}
          </Button>
          {reopenMsg && <p className="text-sm">{reopenMsg}</p>}
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>{t("track.location")}</CardTitle>
          <PinMap position={[i.lat, i.lng]} zoom={16} />
          {i.locality && <p className="mt-2 text-sm text-slate-600">{i.locality}</p>}
        </Card>
        <Card>
          <CardTitle>{t("track.timeline")}</CardTitle>
          <Timeline entries={timeline} />
        </Card>
      </div>
    </div>
  );
}
