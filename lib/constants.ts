export const CATEGORIES = [
  "pothole_road_damage",
  "water_leak_supply",
  "sewage_drainage",
  "garbage_waste",
  "streetlight",
  "electricity_hazard",
  "air_pollution",
  "water_pollution",
  "noise_pollution",
  "tree_fall_obstruction",
  "waterlogging_flood",
  "stray_animals",
  "encroachment",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const STATUSES = ["open", "acknowledged", "in_progress", "resolved", "closure_rejected", "reopened", "invalid"] as const;
export type IncidentStatus = (typeof STATUSES)[number];

export const ACTIVE_STATUSES: IncidentStatus[] = ["open", "acknowledged", "in_progress", "closure_rejected", "reopened"];

export const CATEGORY_ICON: Record<Category, string> = {
  pothole_road_damage: "🕳️",
  water_leak_supply: "🚰",
  sewage_drainage: "🧪",
  garbage_waste: "🗑️",
  streetlight: "💡",
  electricity_hazard: "⚡",
  air_pollution: "🏭",
  water_pollution: "🌊",
  noise_pollution: "📢",
  tree_fall_obstruction: "🌳",
  waterlogging_flood: "🌧️",
  stray_animals: "🐄",
  encroachment: "🚧",
  other: "📌",
};

export const SEVERITY_COLOR: Record<number, string> = {
  1: "#22C55E",
  2: "#84CC16",
  3: "#EAB308",
  4: "#F97316",
  5: "#DC2626",
};

/** §13 — dedupe search radius per category (metres). */
export const DEFAULT_DEDUPE_RADIUS_M = 50;
export const DEDUPE_RADIUS_OVERRIDES: Partial<Record<Category, number>> = {
  waterlogging_flood: 150,
  air_pollution: 150,
  streetlight: 30,
};

export const RESOLVE_MAX_DISTANCE_M = 100;
export const VERIFY_MIN_CONFIDENCE = 0.7;
export const SAME_ISSUE_MIN_CONFIDENCE = 0.6;
export const LOW_CONFIDENCE_ROUTE_THRESHOLD = 0.5;
export const REOPEN_WINDOW_DAYS = 7;
export const ADMIN_DESK_CODE = "ADMIN_DESK";

export const UPLOAD_MIME = {
  photo: ["image/jpeg", "image/png", "image/webp"],
  audio: ["audio/webm", "audio/ogg", "audio/mp4"],
  after: ["image/jpeg", "image/png", "image/webp"],
} as const;
export type UploadKind = keyof typeof UPLOAD_MIME;

export const BUCKETS = {
  report: "report-media",
  resolution: "resolution-media",
} as const;

export const LANGS = ["en", "or", "hi"] as const;
export type Lang = (typeof LANGS)[number];
