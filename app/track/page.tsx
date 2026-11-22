import type { Metadata } from "next";
import { TrackSearch } from "@/components/incident/TrackSearch";

export const metadata: Metadata = { title: "Track a complaint" };

export default function TrackIndexPage() {
  return <TrackSearch />;
}
