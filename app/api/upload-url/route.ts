import { NextResponse } from "next/server";
import { z } from "zod";
import { handler, parseBody } from "@/lib/api";
import { requireStaff } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/ratelimit";
import { createUploadUrl } from "@/lib/storage";

export const runtime = "nodejs";

const Body = z.object({
  files: z
    .array(z.object({ kind: z.enum(["photo", "audio", "after"]), mime: z.string() }))
    .min(1)
    .max(3),
});

/** §16.1 — signed direct-to-storage upload URLs (bypasses Vercel's body limit). */
export const POST = handler(async (req: Request) => {
  const { files } = await parseBody(req, Body);
  // Resolution photos are staff-only; citizen uploads are anonymous but rate-limited.
  if (files.some((f) => f.kind === "after")) await requireStaff();
  else await enforceRateLimit(req, "upload");

  const uploads = await Promise.all(files.map((f) => createUploadUrl(f.kind, f.mime)));
  return NextResponse.json({ uploads });
});
