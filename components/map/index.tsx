"use client";

import dynamic from "next/dynamic";

const placeholder = () => <div className="h-56 w-full animate-pulse rounded-2xl bg-slate-200" />;

/** Leaflet touches `window`, so map components are client-only. */
export const PinMap = dynamic(() => import("./PinMap"), { ssr: false, loading: placeholder });
export const IncidentMap = dynamic(() => import("./IncidentMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-slate-200" />,
});
