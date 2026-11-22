"use client";

import { useI18n } from "@/lib/i18n";
import type { StatusLogEntry } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { StatusPill } from "./StatusPill";

export function Timeline({ entries }: { entries: StatusLogEntry[] }) {
  const { lang } = useI18n();
  return (
    <ol className="relative ml-2 border-l-2 border-slate-200">
      {entries.map((e) => (
        <li key={e.id} className="mb-4 ml-4">
          <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-primary" />
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={e.to_status} />
            <time className="text-xs text-slate-500">{formatDateTime(e.created_at, lang)}</time>
            <span className="text-xs text-slate-400">· {e.actor}</span>
          </div>
          {e.note && <p className="mt-1 text-sm text-slate-700">{e.note}</p>}
        </li>
      ))}
    </ol>
  );
}
