import L from "leaflet";
import { SEVERITY_COLOR } from "@/lib/constants";

/** CSS-only markers — avoids Leaflet's default PNG icons, which break under bundlers. */
export function severityIcon(severity: number, status?: string) {
  const color = SEVERITY_COLOR[severity] ?? "#64748b";
  const ring = status === "resolved" ? "#16a34a" : "#ffffff";
  return L.divIcon({
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<span style="display:block;width:22px;height:22px;border-radius:9999px;background:${color};border:3px solid ${ring};box-shadow:0 1px 4px rgba(0,0,0,.4)"></span>`,
  });
}

export const pinIcon = L.divIcon({
  className: "",
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  html: `<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg"><path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26C32 7.2 24.8 0 16 0z" fill="#0B5FFF"/><circle cx="16" cy="16" r="6" fill="#fff"/></svg>`,
});

export const OSM_TILES = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};
