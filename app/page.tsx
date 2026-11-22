import { Landing, type LandingCounters } from "@/components/layout/Landing";
import { getStats } from "@/lib/public";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let counters: LandingCounters | null = null;
  try {
    const { totals } = await getStats();
    counters = { reported: totals.total, resolved: totals.resolved, avgHours: totals.avg_resolution_hours };
  } catch {
    // DB unreachable (e.g. paused free project) — still render the landing page.
  }
  return <Landing counters={counters} />;
}
