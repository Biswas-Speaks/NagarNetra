import "server-only";
import { z } from "zod";

/** Server-only env. Importing this from a client component fails the build. */
const optional = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined));

const schema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  GROQ_API_KEY: optional,
  GROQ_STT_MODEL: z.string().default("whisper-large-v3-turbo"),
  GROQ_VISION_MODEL: optional,
  GROQ_TEXT_MODEL: z.string().default("llama-3.3-70b-versatile"),

  NOMINATIM_USER_AGENT: z.string().default("NagarNetra/1.0"),
  CITY_NAME: z.string().default("Bhubaneswar"),
  CITY_CODE: z.string().default("BBS"),
  CITY_BBOX: z.string().default("85.70,20.18,85.95,20.42"),

  CRON_SECRET: optional,
  TELEGRAM_BOT_TOKEN: optional,
});

let cached: z.infer<typeof schema> | undefined;

/** Lazily validated so `next build` doesn't need secrets for static pages. */
export function serverEnv() {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid server environment variables:\n${z.prettifyError(parsed.error)}`);
  }
  cached = parsed.data;
  return cached;
}
