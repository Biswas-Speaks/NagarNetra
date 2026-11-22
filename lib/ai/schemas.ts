import { z } from "zod";
import { CATEGORIES } from "@/lib/constants";

/** Model output can overrun length hints — truncate instead of failing the whole report. */
const clip = (max: number) => z.string().transform((s) => s.trim().slice(0, max));
const unit = z.number().transform((n) => Math.min(1, Math.max(0, n)));

export const TranscriptionSchema = z.object({
  transcript: z.string(),
  lang: z.string().transform((l) => l.toLowerCase().slice(0, 5)),
  transcript_en: z.string(),
});

export const TriageSchema = z.object({
  is_valid: z.boolean(),
  invalid_reason: z.string().optional(),
  category: z.enum(CATEGORIES).catch("other"),
  severity: z.number().transform((n) => Math.min(5, Math.max(1, Math.round(n)))),
  severity_reason: clip(200),
  risk_to_life: z.boolean(),
  near_sensitive_site: z.boolean().default(false),
  title_en: clip(60),
  summary_en: clip(200),
  summary_or: clip(300),
  summary_hi: clip(300),
  visible_details: z
    .array(z.string())
    .default([])
    .transform((a) => a.slice(0, 5)),
  confidence: unit,
});

export const SameIssueSchema = z.object({
  same_issue: z.boolean(),
  confidence: unit,
  reason: clip(150),
});

export const VerifySchema = z.object({
  fixed: z.boolean(),
  confidence: unit,
  same_location: z.boolean(),
  reason: clip(200),
  remaining_issues: z
    .array(z.string())
    .default([])
    .transform((a) => a.slice(0, 3)),
});

export const LetterSchema = z.object({ letter: clip(1200) });

export type Transcription = z.output<typeof TranscriptionSchema>;
export type TriageOutput = z.output<typeof TriageSchema>;
export type SameIssueOutput = z.output<typeof SameIssueSchema>;
export type VerifyOutput = z.output<typeof VerifySchema>;

/** JSON Schema text embedded in prompts so every provider sees the same contract. */
export function schemaHint(schema: z.ZodType): string {
  return JSON.stringify(z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }));
}

/** Extracts and validates JSON from a model reply (tolerates ```json fences). */
export function parseModelJson<T>(text: string, schema: z.ZodType<T>): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Model reply contained no JSON object");
  return schema.parse(JSON.parse(text.slice(start, end + 1)));
}
