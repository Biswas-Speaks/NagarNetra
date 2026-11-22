import type { Metadata } from "next";
import { StatsView } from "@/components/stats/StatsView";
import { getStats } from "@/lib/public";

export const metadata: Metadata = { title: "Transparency dashboard" };
export const dynamic = "force-dynamic";

export default async function StatsPage() {
  return <StatsView stats={await getStats()} />;
}
