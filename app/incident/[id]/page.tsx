import { notFound } from "next/navigation";
import { IncidentView } from "@/components/incident/IncidentView";
import { ApiError } from "@/lib/api";
import { getIncidentDetail } from "@/lib/public";

export const dynamic = "force-dynamic";

export default async function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    return <IncidentView detail={await getIncidentDetail(id)} />;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
}
