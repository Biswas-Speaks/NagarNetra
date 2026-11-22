"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { LanguageToggle } from "./LanguageToggle";

const NAV: { href: string; key: MessageKey }[] = [
  { href: "/report", key: "nav.report" },
  { href: "/map", key: "nav.map" },
  { href: "/stats", key: "nav.stats" },
  { href: "/track", key: "nav.track" },
];

export function Header() {
  const { t } = useI18n();
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
        <Link href="/" className="flex items-center gap-2 font-bold text-primary">
          <span aria-hidden className="text-2xl">
            👁️
          </span>
          <span className="text-lg">{t("app.name")}</span>
        </Link>
        <nav className="ml-auto hidden gap-1 sm:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-100",
                pathname.startsWith(n.href) ? "text-primary" : "text-slate-600",
              )}
            >
              {t(n.key)}
            </Link>
          ))}
        </nav>
        <div className="ml-auto sm:ml-2">
          <LanguageToggle />
        </div>
      </div>
      {/* Mobile bottom-style nav row */}
      <nav className="flex border-t border-slate-100 sm:hidden">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              "flex-1 py-2.5 text-center text-sm font-medium",
              pathname.startsWith(n.href) ? "text-primary" : "text-slate-600",
            )}
          >
            {t(n.key)}
          </Link>
        ))}
      </nav>
    </header>
  );
}
