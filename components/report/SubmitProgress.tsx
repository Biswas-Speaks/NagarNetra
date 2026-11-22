"use client";

import { Check } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const STEPS = ["uploading", "understanding", "routing", "done"] as const;
export type Step = (typeof STEPS)[number];

export function SubmitProgress({ step }: { step: Step }) {
  const { t } = useI18n();
  const current = STEPS.indexOf(step);
  return (
    <ol className="space-y-3" aria-live="polite">
      {STEPS.map((s, i) => (
        <li key={s} className={cn("flex items-center gap-3 text-base", i > current && "text-slate-400")}>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
            {i < current || (s === "done" && i === current) ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : i === current ? (
              <Spinner className="text-primary" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-slate-300" />
            )}
          </span>
          {t(`report.progress.${s}` as MessageKey)}
        </li>
      ))}
    </ol>
  );
}
