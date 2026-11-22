"use client";

import { Camera, Mic, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

export interface LandingCounters {
  reported: number;
  resolved: number;
  avgHours: number | null;
}

/** §17.2 — hero, live counters, how-it-works. */
export function Landing({ counters }: { counters: LandingCounters | null }) {
  const { t } = useI18n();
  const steps = [
    { icon: <Camera className="h-6 w-6" />, title: t("landing.step1"), body: t("landing.step1d") },
    { icon: <Sparkles className="h-6 w-6" />, title: t("landing.step2"), body: t("landing.step2d") },
    { icon: <ShieldCheck className="h-6 w-6" />, title: t("landing.step3"), body: t("landing.step3d") },
  ];

  return (
    <div className="space-y-8 py-4">
      <section className="rounded-3xl bg-gradient-to-br from-primary to-primary-dark p-6 text-white sm:p-10">
        <p className="text-sm font-semibold tracking-wide text-white/80 uppercase">
          {t("app.name")} · {t("app.tagline")}
        </p>
        <h1 className="mt-2 text-3xl leading-tight font-extrabold sm:text-5xl">{t("landing.hero")}</h1>
        <p className="mt-3 max-w-2xl text-white/90 sm:text-lg">{t("landing.sub")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/report" className={buttonClass("accent", "lg")}>
            <Mic className="h-5 w-5" /> {t("landing.cta")}
          </Link>
          <Link href="/map" className={buttonClass("outline", "lg", "border-white/40 bg-white/10 text-white hover:bg-white/20")}>
            {t("landing.viewMap")}
          </Link>
        </div>
      </section>

      {counters && (
        <section className="grid grid-cols-3 gap-3">
          <Card className="text-center">
            <p className="text-3xl font-bold text-primary">{counters.reported}</p>
            <p className="text-xs text-slate-500 sm:text-sm">{t("landing.reported")}</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-green-600">{counters.resolved}</p>
            <p className="text-xs text-slate-500 sm:text-sm">{t("landing.resolved")}</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-accent">
              {counters.avgHours ?? "—"}
              <span className="text-base">{counters.avgHours !== null && t("common.hours")}</span>
            </p>
            <p className="text-xs text-slate-500 sm:text-sm">{t("landing.avgFix")}</p>
          </Card>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xl font-bold">{t("landing.how")}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {steps.map((s, idx) => (
            <Card key={s.title} className="flex gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {s.icon}
              </span>
              <div>
                <p className="font-semibold">
                  {idx + 1}. {s.title}
                </p>
                <p className="text-sm text-slate-600">{s.body}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
