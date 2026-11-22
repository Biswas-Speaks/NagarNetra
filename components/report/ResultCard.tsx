"use client";

import Link from "next/link";
import { useState } from "react";
import { SeverityChip } from "@/components/incident/SeverityChip";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CATEGORY_ICON, type Category } from "@/lib/constants";
import { useI18n, type MessageKey } from "@/lib/i18n";

export interface ReportResponse {
  ticket_code: string;
  incident_id: string;
  merged: boolean;
  report_number: number;
  category: Category;
  severity: number;
  department: string | null;
  summary: { en: string; or: string; hi: string };
  track_url: string;
}

export function ResultCard({ result, onAnother }: { result: ReportResponse; onAnother: () => void }) {
  const { t, lang } = useI18n();
  const [copied, setCopied] = useState(false);
  const localSummary = result.summary[lang] || result.summary.en;

  async function copy() {
    await navigator.clipboard.writeText(result.ticket_code).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function share() {
    const url = `${window.location.origin}${result.track_url}`;
    if (navigator.share) await navigator.share({ title: `NagarNetra ${result.ticket_code}`, url }).catch(() => undefined);
    else await navigator.clipboard.writeText(url).catch(() => undefined);
  }

  return (
    <Card className="space-y-4">
      <h2 className="text-xl font-bold text-green-700">✅ {t("result.title")}</h2>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100 p-3">
        <div>
          <p className="text-xs text-slate-500">{t("result.ticket")}</p>
          <p className="font-mono text-2xl font-bold tracking-wider">{result.ticket_code}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copy}>
            {copied ? t("result.copied") : t("result.copy")}
          </Button>
          <Button variant="outline" size="sm" onClick={share}>
            {t("result.share")}
          </Button>
        </div>
      </div>

      {result.merged && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-900">
          {t("result.merged", { n: result.report_number })}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-2xl" aria-hidden>
          {CATEGORY_ICON[result.category]}
        </span>
        <span className="font-semibold">{t(`cat.${result.category}` as MessageKey)}</span>
        <SeverityChip severity={result.severity} />
      </div>
      {result.department && (
        <p className="text-sm">
          <span className="text-slate-500">{t("result.department")}: </span>
          <span className="font-medium">{result.department}</span>
        </p>
      )}
      {localSummary && <p className="text-slate-700">{localSummary}</p>}
      {lang !== "en" && result.summary.en && <p className="text-sm text-slate-500">{result.summary.en}</p>}

      <div className="grid grid-cols-2 gap-2">
        <Link href={result.track_url} className={buttonClass("primary")}>
          {t("result.track")}
        </Link>
        <Button variant="outline" onClick={onAnother}>
          {t("result.another")}
        </Button>
      </div>
    </Card>
  );
}
