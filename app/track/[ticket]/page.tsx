import type { Metadata } from "next";
import { IncidentView } from "@/components/incident/IncidentView";
import { TrackSearch } from "@/components/incident/TrackSearch";
import { ApiError } from "@/lib/api";
import { getIncidentDetail } from "@/lib/public";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ ticket: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ticket } = await params;
  return { title: decodeURIComponent(ticket).toUpperCase() };
}

export default async function TrackPage({ params }: Props) {
  const { ticket } = await params;
  try {
    const detail = await getIncidentDetail(decodeURIComponent(ticket));
    return <IncidentView detail={detail} />;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return <TrackSearch notFound />;
    throw err;
  }
}
