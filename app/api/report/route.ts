import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handler, parseBody } from "@/lib/api";
import { LANGS } from "@/lib/constants";
import { serverEnv } from "@/lib/env/server";
import { inBBox, parseBBox } from "@/lib/geo";
import { enforceRateLimit } from "@/lib/ratelimit";
import { assertSafePath } from "@/lib/storage";
import { processReport } from "@/lib/triage";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z
  .object({
    photo_path: z.string().nullish(),
    audio_path: z.string().nullish(),
    text: z.string().trim().max(500).nullish(),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracy: z.number().nonnegative().nullish(),
    ui_lang: z.enum(LANGS).default("en"),
    reporter: z
      .object({
        name: z.string().trim().max(80).nullish(),
        phone: z
          .string()
          .trim()
          .regex(/^[0-9+\-\s]{7,15}$/, "Invalid phone number")
          .nullish()
          .or(z.literal("")),
      })
      .nullish(),
  })
  .refine((b) => b.photo_path || b.audio_path || b.text, {
    message: "Add at least a photo, a voice note or a description",
  });

/** §16.2 — submit a citizen report. */
export const POST = handler(async (req: Request) => {
  await enforceRateLimit(req, "report");
  const body = await parseBody(req, Body);

  assertSafePath(body.photo_path, "report");
  assertSafePath(body.audio_path, "report");

  // Service-area check only when CITY_BBOX is configured; the MVP accepts reports from anywhere.
  const { CITY_BBOX, CITY_NAME } = serverEnv();
  if (CITY_BBOX && !inBBox(body.lat, body.lng, parseBBox(CITY_BBOX))) {
    throw new ApiError(422, "OUT_OF_AREA", `This location is outside ${CITY_NAME}'s service area`);
  }

  const result = await processReport({
    ...body,
    reporter: body.reporter ? { name: body.reporter.name, phone: body.reporter.phone || null } : null,
  });
  return NextResponse.json(result, { status: 201 });
});
