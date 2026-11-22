"use client";

import type { IncidentStatus } from "@/lib/constants";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const STYLE: Record<IncidentStatus, string> = {
  open: "bg-blue-100 text-blue-800",
  acknowledged: "bg-indigo-100 text-indigo-800",
  in_progress: "bg-amber-100 text-amber-800",
  resolved: "bg-green-100 text-green-800",
  closure_rejected: "bg-red-100 text-red-800",
  reopened: "bg-orange-100 text-orange-800",
  invalid: "bg-slate-200 text-slate-600",
};

export function StatusPill({ status }: { status: IncidentStatus }) {
  const { t } = useI18n();
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", STYLE[status])}>
      {t(`status.${status}` as MessageKey)}
    </span>
  );
}
