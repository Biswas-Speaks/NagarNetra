import "server-only";
import { randomUUID } from "node:crypto";
import { BUCKETS, UPLOAD_MIME, type UploadKind } from "./constants";
import { ApiError } from "./api";
import { getAdminSupabase } from "./supabase/admin";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
};

/** Paths under `resolutions/` live in the resolution bucket; everything else in report-media. */
export function bucketFor(path: string) {
  return path.startsWith("resolutions/") ? BUCKETS.resolution : BUCKETS.report;
}

const SAFE_PATH = /^(reports\/\d{4}\/\d{2}|resolutions)\/[0-9a-f-]{36}\.(jpg|png|webp|webm|ogg|m4a)$/;

export function assertSafePath(path: string | null | undefined, kind: "report" | "resolution") {
  if (!path) return;
  if (!SAFE_PATH.test(path) || (kind === "resolution") !== path.startsWith("resolutions/")) {
    throw new ApiError(400, "BAD_PATH", "Invalid media path");
  }
}

export async function createUploadUrl(kind: UploadKind, mime: string) {
  if (!(UPLOAD_MIME[kind] as readonly string[]).includes(mime)) {
    throw new ApiError(400, "BAD_MIME", `Unsupported ${kind} type: ${mime}`);
  }
  const now = new Date();
  const name = `${randomUUID()}.${EXT[mime]}`;
  const path =
    kind === "after"
      ? `resolutions/${name}`
      : `reports/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${name}`;
  const bucket = bucketFor(path);

  const { data, error } = await getAdminSupabase().storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) throw new ApiError(502, "STORAGE_ERROR", "Could not create upload URL");
  return { kind, bucket, path, signedUrl: data.signedUrl, token: data.token };
}

export async function downloadMedia(path: string): Promise<{ data: Buffer; mime: string }> {
  const { data, error } = await getAdminSupabase().storage.from(bucketFor(path)).download(path);
  if (error || !data) throw new ApiError(400, "MEDIA_MISSING", `Uploaded file not found: ${path}`);
  return { data: Buffer.from(await data.arrayBuffer()), mime: data.type || "application/octet-stream" };
}

export async function signedReadUrl(path: string | null | undefined, expiresIn = 3600): Promise<string | null> {
  if (!path) return null;
  const { data } = await getAdminSupabase().storage.from(bucketFor(path)).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

/** Batch-sign many paths (map list endpoints). */
export async function signedReadUrls(paths: string[], expiresIn = 3600): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const byBucket = new Map<string, string[]>();
  for (const p of paths) byBucket.set(bucketFor(p), [...(byBucket.get(bucketFor(p)) ?? []), p]);
  for (const [bucket, list] of byBucket) {
    const { data } = await getAdminSupabase().storage.from(bucket).createSignedUrls(list, expiresIn);
    data?.forEach((d) => d.path && d.signedUrl && out.set(d.path, d.signedUrl));
  }
  return out;
}
