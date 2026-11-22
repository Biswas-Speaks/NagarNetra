"use client";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface Verdict {
  accepted: boolean | null;
  confidence: number | null;
  reason: string | null;
  remaining_issues?: string[] | null;
  distance_m?: number | null;
}

export function AIVerdict({ verdict }: { verdict: Verdict }) {
  const { t } = useI18n();
  const ok = verdict.accepted === true;
  return (
    <div className={cn("rounded-xl border-2 p-4", ok ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50")}>
      <p className={cn("font-bold", ok ? "text-green-800" : "text-red-800")}>
        {ok ? "✅" : "❌"} {t("track.aiVerdict")}: {ok ? t("track.fixed") : t("track.notFixed")}
      </p>
      {verdict.reason && <p className="mt-1 text-sm text-slate-700">{verdict.reason}</p>}
      {!!verdict.remaining_issues?.length && (
        <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
          {verdict.remaining_issues.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-slate-500">
        {verdict.confidence !== null && `${t("track.confidence")}: ${Math.round(Number(verdict.confidence) * 100)}%`}
        {verdict.distance_m != null && ` · ${Math.round(verdict.distance_m)} m`}
      </p>
    </div>
  );
}
