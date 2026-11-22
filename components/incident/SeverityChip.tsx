"use client";

import { SEVERITY_COLOR } from "@/lib/constants";
import { useI18n, type MessageKey } from "@/lib/i18n";

export function SeverityChip({ severity }: { severity: number }) {
  const { t } = useI18n();
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
      style={{ backgroundColor: SEVERITY_COLOR[severity] }}
    >
      {severity} · {t(`sev.${severity}` as MessageKey)}
    </span>
  );
}
