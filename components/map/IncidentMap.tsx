"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { mapCenter } from "@/lib/env/client";
import type { PublicIncident } from "@/lib/types";
import { OSM_TILES, severityIcon } from "./icons";

export interface IncidentMapProps {
  incidents: PublicIncident[];
  heatmap: boolean;
  popupHtml: (i: PublicIncident) => string;
}

/** The cluster and heat plugins are UMD scripts that patch a global `L`. */
async function loadPlugins() {
  (window as unknown as { L: typeof L }).L = L;
  await Promise.all([import("leaflet.markercluster"), import("leaflet.heat")]);
}

function Layers({ incidents, heatmap, popupHtml }: IncidentMapProps) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const heatRef = useRef<L.Layer | null>(null);
  const fittedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void loadPlugins().then(() => {
      if (cancelled) return;
      clusterRef.current?.remove();
      heatRef.current?.remove();

      // Reports can come from anywhere — frame them once on first load.
      if (!fittedRef.current && incidents.length) {
        fittedRef.current = true;
        map.fitBounds(L.latLngBounds(incidents.map((i) => [i.lat, i.lng])), { padding: [40, 40], maxZoom: 15 });
      }

      if (heatmap) {
        heatRef.current = L.heatLayer(
          incidents.map((i) => [i.lat, i.lng, i.severity / 5] as [number, number, number]),
          { radius: 28, blur: 20, maxZoom: 17 },
        ).addTo(map);
        return;
      }

      const cluster = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 45 });
      incidents.forEach((i) => {
        cluster.addLayer(L.marker([i.lat, i.lng], { icon: severityIcon(i.severity, i.status) }).bindPopup(popupHtml(i)));
      });
      clusterRef.current = cluster.addTo(map);
    });
    return () => {
      cancelled = true;
    };
  }, [map, incidents, heatmap, popupHtml]);

  useEffect(
    () => () => {
      clusterRef.current?.remove();
      heatRef.current?.remove();
    },
    [],
  );

  return null;
}

export default function IncidentMap(props: IncidentMapProps) {
  return (
    <MapContainer center={mapCenter} zoom={13} className="h-full w-full">
      <TileLayer url={OSM_TILES.url} attribution={OSM_TILES.attribution} />
      <Layers {...props} />
    </MapContainer>
  );
}
