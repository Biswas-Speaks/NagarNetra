"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_ICON } from "@/lib/constants";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { PublicIncident } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DEFAULT_FILTERS, FilterDrawer, type MapFilters } from "./FilterDrawer";
import { IncidentMap } from "./index";

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** §17.5 — full-screen public map with filters, heatmap and Realtime refresh. */
export function MapView() {
  const { t, lang } = useI18n();
  const [filters, setFilters] = useState<MapFilters>(DEFAULT_FILTERS);
  const [incidents, setIncidents] = useState<PublicIncident[]>([]);
  const [drawer, setDrawer] = useState(false);
  const [live, setLive] = useState(false);
  const refetchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (filters.categories.length) qs.set("category", filters.categories.join(","));
    if (filters.status) qs.set("status", filters.status);
    if (filters.severityMin > 1) qs.set("severity_min", String(filters.severityMin));
    if (filters.since) qs.set("since", filters.since);
    const res = await fetch(`/api/incidents?${qs}`);
    if (res.ok) setIncidents(((await res.json()) as { incidents: PublicIncident[] }).incidents);
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  // FR-6.4 — refetch (debounced) whenever any incident changes.
  useEffect(() => {
    const channel = getBrowserSupabase()
      .channel("incidents-map")
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, () => {
        clearTimeout(refetchTimer.current);
        refetchTimer.current = setTimeout(() => void load(), 800);
      })
      .subscribe((status: string) => setLive(status === "SUBSCRIBED"));
    return () => {
      clearTimeout(refetchTimer.current);
      void getBrowserSupabase().removeChannel(channel);
    };
  }, [load]);

  const popupHtml = useMemo(
    () => (i: PublicIncident) => {
      const summary = (lang === "or" ? i.summary_or : lang === "hi" ? i.summary_hi : null) || i.summary_en || "";
      return `<div style="min-width:180px">
        <strong>${CATEGORY_ICON[i.category]} ${escape(i.title_en ?? t(`cat.${i.category}` as MessageKey))}</strong><br/>
        <small>${escape(i.ticket_code)} · ${escape(t(`status.${i.status}` as MessageKey))} · S${i.severity}</small>
        <p style="margin:4px 0">${escape(summary)}</p>
        <a href="/incident/${i.id}">${escape(t("map.open"))} →</a></div>`;
    },
    [lang, t],
  );

  return (
    <div className="relative -mx-4 -my-4 h-[calc(100dvh-108px)] sm:h-[calc(100dvh-57px)]">
      <IncidentMap incidents={incidents} heatmap={filters.heatmap} popupHtml={popupHtml} />

      <div className="pointer-events-none absolute top-3 right-3 left-3 z-[500] flex items-start justify-between gap-2">
        <span className="pointer-events-auto rounded-full bg-white px-3 py-1.5 text-sm font-medium shadow">
          {live && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-green-500" aria-label={t("map.live")} />}
          {t("map.count", { n: incidents.length })}
        </span>
        <button
          onClick={() => setDrawer(true)}
          className="pointer-events-auto flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold shadow"
        >
          <SlidersHorizontal className="h-4 w-4" /> {t("map.filters")}
        </button>
      </div>

      <aside
        className={cn(
          "absolute inset-y-0 right-0 z-[600] w-80 max-w-[85vw] overflow-y-auto bg-white p-4 shadow-2xl transition-transform",
          drawer ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!drawer}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">{t("map.filters")}</h2>
          <button onClick={() => setDrawer(false)} className="rounded-lg p-2 hover:bg-slate-100" aria-label={t("common.close")}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <FilterDrawer value={filters} onChange={setFilters} />
      </aside>
    </div>
  );
}
