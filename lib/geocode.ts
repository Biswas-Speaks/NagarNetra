import "server-only";
import { serverEnv } from "./env/server";
import { getAdminSupabase } from "./supabase/admin";

export interface GeoPlace {
  locality: string | null;
  ward: string | null;
}

interface NominatimAddress {
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city_district?: string;
  village?: string;
  town?: string;
  city?: string;
  road?: string;
}

/** §FR-4.2 — reverse geocode via Nominatim with a 4-decimal (~11 m) DB cache. */
export async function reverseGeocode(lat: number, lng: number): Promise<GeoPlace> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const db = getAdminSupabase();

  const { data: hit } = await db.from("geocode_cache").select("locality, ward").eq("key", key).maybeSingle<GeoPlace>();
  if (hit) return hit;

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&addressdetails=1&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, {
      headers: { "User-Agent": serverEnv().NOMINATIM_USER_AGENT, "Accept-Language": "en" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { locality: null, ward: null };
    const raw = (await res.json()) as { address?: NominatimAddress };
    const a = raw.address ?? {};
    const place: GeoPlace = {
      locality: a.neighbourhood || a.suburb || a.quarter || a.village || a.road || a.town || a.city || null,
      ward: a.city_district || a.suburb || null,
    };
    await db.from("geocode_cache").upsert({ key, ...place, raw });
    return place;
  } catch {
    return { locality: null, ward: null };
  }
}
