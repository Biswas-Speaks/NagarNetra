"use client";

import imageCompression from "browser-image-compression";
import type { UploadKind } from "@/lib/constants";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { apiErrorMessage } from "@/lib/utils";

/**
 * §FR-1.2 — ≤1280 px long edge, ≤500 KB, re-encoded as WebP.
 * Re-encoding through a canvas also drops EXIF (incl. GPS) metadata.
 */
export async function compressImage(file: File): Promise<File> {
  return imageCompression(file, {
    maxWidthOrHeight: 1280,
    maxSizeMB: 0.5,
    fileType: "image/webp",
    useWebWorker: true,
    preserveExif: false,
  });
}

interface SignedUpload {
  kind: UploadKind;
  bucket: string;
  path: string;
  token: string;
}

/** §FR-1.9 — get signed URLs from our API, then upload straight to Supabase Storage. */
export async function uploadFiles(files: { kind: UploadKind; blob: Blob }[]): Promise<Record<string, string>> {
  if (!files.length) return {};
  const res = await fetch("/api/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files: files.map((f) => ({ kind: f.kind, mime: baseMime(f.blob.type) })) }),
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  const { uploads } = (await res.json()) as { uploads: SignedUpload[] };

  const storage = getBrowserSupabase().storage;
  const paths: Record<string, string> = {};
  await Promise.all(
    uploads.map(async (u, i) => {
      const { error } = await storage.from(u.bucket).uploadToSignedUrl(u.path, u.token, files[i].blob, {
        contentType: baseMime(files[i].blob.type),
      });
      if (error) throw new Error(`Upload failed: ${error.message}`);
      paths[u.kind] = u.path;
    }),
  );
  return paths;
}

/** MediaRecorder reports e.g. "audio/webm;codecs=opus" — storage wants the bare type. */
function baseMime(type: string) {
  return type.split(";")[0].trim() || "application/octet-stream";
}

export function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("Geolocation unsupported"));
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 });
  });
}
