"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function TrackSearch({ notFound }: { notFound?: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [code, setCode] = useState("");

  return (
    <div className="mx-auto max-w-md space-y-3">
      <h1 className="text-2xl font-bold">{t("track.title")}</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) router.push(`/track/${encodeURIComponent(code.trim().toUpperCase())}`);
        }}
        className="flex gap-2"
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t("track.searchPlaceholder")}
          className="h-12 flex-1 rounded-xl border border-slate-300 px-3 font-mono uppercase"
          autoCapitalize="characters"
        />
        <Button type="submit">{t("track.search")}</Button>
      </form>
      {notFound && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{t("track.notFound")}</p>}
    </div>
  );
}
