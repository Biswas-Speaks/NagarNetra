"use client";

import { CATEGORIES, STATUSES, type Category, type IncidentStatus } from "@/lib/constants";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface MapFilters {
  categories: Category[];
  status: IncidentStatus | "";
  severityMin: number;
  since: string;
  heatmap: boolean;
}

export const DEFAULT_FILTERS: MapFilters = { categories: [], status: "", severityMin: 1, since: "", heatmap: false };

export function FilterDrawer({ value, onChange }: { value: MapFilters; onChange: (f: MapFilters) => void }) {
  const { t } = useI18n();
  const set = <K extends keyof MapFilters>(k: K, v: MapFilters[K]) => onChange({ ...value, [k]: v });
  const toggleCat = (c: Category) =>
    set("categories", value.categories.includes(c) ? value.categories.filter((x) => x !== c) : [...value.categories, c]);

  return (
    <div className="space-y-4 text-sm">
      <label className="flex items-center justify-between font-medium">
        {t("map.heatmap")}
        <input type="checkbox" checked={value.heatmap} onChange={(e) => set("heatmap", e.target.checked)} className="h-5 w-5" />
      </label>

      <fieldset>
        <legend className="mb-2 font-medium">{t("map.category")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleCat(c)}
              aria-pressed={value.categories.includes(c)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs",
                value.categories.includes(c) ? "border-primary bg-primary text-white" : "border-slate-300 bg-white",
              )}
            >
              {t(`cat.${c}` as MessageKey)}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1 block font-medium">{t("map.status")}</span>
        <select
          value={value.status}
          onChange={(e) => set("status", e.target.value as MapFilters["status"])}
          className="h-11 w-full rounded-lg border border-slate-300 px-2"
        >
          <option value="">{t("map.all")}</option>
          {STATUSES.filter((s) => s !== "invalid").map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}` as MessageKey)}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block font-medium">
          {t("map.severityMin")}: {value.severityMin}
        </span>
        <input
          type="range"
          min={1}
          max={5}
          value={value.severityMin}
          onChange={(e) => set("severityMin", Number(e.target.value))}
          className="w-full"
        />
      </label>

      <label className="block">
        <span className="mb-1 block font-medium">{t("map.since")}</span>
        <input
          type="date"
          value={value.since}
          onChange={(e) => set("since", e.target.value)}
          className="h-11 w-full rounded-lg border border-slate-300 px-2"
        />
      </label>
    </div>
  );
}
