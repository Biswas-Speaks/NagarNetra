"use client";

import { useI18n, type MessageKey } from "@/lib/i18n";

/** Localised page heading for server-rendered pages. */
export function PageTitle({ k }: { k: MessageKey }) {
  const { t } = useI18n();
  return <h1 className="mb-4 text-2xl font-bold">{t(k)}</h1>;
}
