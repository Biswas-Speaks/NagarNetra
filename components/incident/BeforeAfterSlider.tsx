"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

/** Drag to compare before/after photos (§17.4). */
export function BeforeAfterSlider({ before, after }: { before: string; after: string }) {
  const { t } = useI18n();
  const [pos, setPos] = useState(50);
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-200 select-none">
      {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URLs */}
      <img src={after} alt={t("track.after")} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={before}
          alt={t("track.before")}
          className="absolute inset-0 h-full w-full max-w-none object-cover"
          style={{ width: `${10000 / pos}%` }}
        />
      </div>
      <div className="pointer-events-none absolute inset-y-0 w-1 bg-white shadow" style={{ left: `calc(${pos}% - 2px)` }} />
      <span className="absolute top-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">{t("track.before")}</span>
      <span className="absolute top-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">{t("track.after")}</span>
      <input
        type="range"
        min={1}
        max={99}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Compare before and after"
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
