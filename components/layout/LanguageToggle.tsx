"use client";

import { LANGS, type Lang } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LABEL: Record<Lang, string> = { en: "EN", or: "ଓଡ଼ିଆ", hi: "हिं" };

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div role="group" aria-label="Language" className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
      {LANGS.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            "min-h-9 rounded-md px-2.5 font-medium",
            lang === l ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-100",
          )}
        >
          {LABEL[l]}
        </button>
      ))}
    </div>
  );
}
