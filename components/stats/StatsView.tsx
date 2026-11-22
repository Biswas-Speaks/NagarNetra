"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardTitle } from "@/components/ui/card";
import { useI18n, type MessageKey } from "@/lib/i18n";
import type { ScorecardRow, Stats } from "@/lib/types";
import { cn } from "@/lib/utils";

export function KpiTile({ label, value, tone }: { label: string; value: string | number; tone?: "good" | "bad" }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn("text-2xl font-bold", tone === "good" && "text-green-700", tone === "bad" && "text-red-700")}>{value}</p>
    </Card>
  );
}

type SortKey = keyof Pick<
  ScorecardRow,
  "total" | "pending" | "resolved" | "rejected_closures" | "sla_breached" | "avg_resolution_hours"
>;

function Scorecard({ rows }: { rows: ScorecardRow[] }) {
  const { t, lang } = useI18n();
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: "total", asc: false });
  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const d = (Number(a[sort.key]) || 0) - (Number(b[sort.key]) || 0);
        return sort.asc ? d : -d;
      }),
    [rows, sort],
  );
  const cols: { key: SortKey; label: string }[] = [
    { key: "total", label: t("stats.total") },
    { key: "pending", label: t("stats.pending") },
    { key: "resolved", label: t("stats.resolved") },
    { key: "avg_resolution_hours", label: t("stats.avgHours") },
    { key: "rejected_closures", label: t("stats.rejected") },
    { key: "sla_breached", label: t("stats.breached") },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="py-2 pr-2">{t("stats.department")}</th>
            {cols.map((c) => (
              <th key={c.key} className="px-2 py-2 text-right">
                <button
                  onClick={() => setSort({ key: c.key, asc: sort.key === c.key ? !sort.asc : false })}
                  className="font-medium"
                >
                  {c.label} {sort.key === c.key ? (sort.asc ? "▲" : "▼") : ""}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const breachRate = r.total ? r.sla_breached / r.total : 0;
            return (
              <tr key={r.id} className={cn("border-b last:border-0", breachRate > 0.2 && "bg-red-50")}>
                <td className="py-2 pr-2 font-medium">{(lang === "or" && r.name_or) || r.name}</td>
                {cols.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-2 py-2 text-right tabular-nums",
                      c.key === "sla_breached" && breachRate > 0.2 && "font-bold text-red-700",
                    )}
                  >
                    {r[c.key] ?? "—"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** §17.6 — KPIs, category bars, scorecard, 30-day trend, fastest/slowest. */
export function StatsView({ stats }: { stats: Stats }) {
  const { t, lang } = useI18n();
  const { totals } = stats;

  const categoryData = stats.by_category.map((c) => ({ name: t(`cat.${c.category}` as MessageKey), count: c.count }));
  const ranked = stats.scorecard
    .filter((s) => s.avg_resolution_hours !== null)
    .sort((a, b) => a.avg_resolution_hours! - b.avg_resolution_hours!);
  const deptName = (r: ScorecardRow) => (lang === "or" && r.name_or) || r.name;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("stats.title")}</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile label={t("stats.total")} value={totals.total} />
        <KpiTile label={t("stats.open")} value={totals.open} />
        <KpiTile label={t("stats.resolved")} value={totals.resolved} tone="good" />
        <KpiTile label={t("stats.avgHours")} value={totals.avg_resolution_hours ?? "—"} />
        <KpiTile label={t("stats.rejected")} value={totals.rejected_closures} tone="bad" />
        <KpiTile label={t("stats.breached")} value={totals.sla_breached} tone="bad" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>{t("stats.byCategory")}</CardTitle>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0B5FFF" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardTitle>{t("stats.trend")}</CardTitle>
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={stats.daily_trend} margin={{ right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="reported"
                  name={t("stats.reportedSeries")}
                  stroke="#FF7A00"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="resolved"
                  name={t("stats.resolvedSeries")}
                  stroke="#16A34A"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>{t("stats.scorecard")}</CardTitle>
        <Scorecard rows={stats.scorecard} />
      </Card>

      {ranked.length > 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardTitle>🏆 {t("stats.fame")}</CardTitle>
            <ol className="space-y-1 text-sm">
              {ranked.slice(0, 3).map((r) => (
                <li key={r.id} className="flex justify-between">
                  <span>{deptName(r)}</span>
                  <span className="font-semibold text-green-700">
                    {r.avg_resolution_hours} {t("common.hours")}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
          <Card>
            <CardTitle>🐢 {t("stats.shame")}</CardTitle>
            <ol className="space-y-1 text-sm">
              {ranked
                .slice(-3)
                .reverse()
                .map((r) => (
                  <li key={r.id} className="flex justify-between">
                    <span>{deptName(r)}</span>
                    <span className="font-semibold text-red-700">
                      {r.avg_resolution_hours} {t("common.hours")}
                    </span>
                  </li>
                ))}
            </ol>
          </Card>
        </div>
      )}
    </div>
  );
}
