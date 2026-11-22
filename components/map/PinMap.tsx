"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { OSM_TILES, pinIcon } from "./icons";

export interface PinMapProps {
  position: [number, number];
  draggable?: boolean;
  onChange?: (lat: number, lng: number) => void;
  className?: string;
  zoom?: number;
}

function Recenter({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, map.getZoom(), { animate: true });
  }, [map, position]);
  return null;
}

function ClickToMove({ onChange }: { onChange?: PinMapProps["onChange"] }) {
  useMapEvents({ click: (e) => onChange?.(e.latlng.lat, e.latlng.lng) });
  return null;
}

/** Single draggable pin — used by the report wizard and incident pages. */
export default function PinMap({ position, draggable = false, onChange, className = "h-56", zoom = 17 }: PinMapProps) {
  return (
    <MapContainer center={position} zoom={zoom} scrollWheelZoom={false} className={`${className} w-full rounded-2xl`}>
      <TileLayer url={OSM_TILES.url} attribution={OSM_TILES.attribution} />
      <Marker
        position={position}
        icon={pinIcon}
        draggable={draggable}
        eventHandlers={{
          dragend: (e) => {
            const ll = e.target.getLatLng();
            onChange?.(ll.lat, ll.lng);
          },
        }}
      />
      <Recenter position={position} />
      {draggable && <ClickToMove onChange={onChange} />}
    </MapContainer>
  );
}
