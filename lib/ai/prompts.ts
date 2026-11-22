import { CATEGORIES, type Category } from "@/lib/constants";
import type { TriageInput } from "./types";

export const SYSTEM_PROMPT = `You are NagarNetra, a civic-infrastructure triage assistant for Indian cities
(default city: Bhubaneswar, Odisha). Analyse the citizen's photo and description.
Be factual: only describe what is visible or stated. Never invent locations.
Return ONLY JSON matching the provided schema.`;

export const SEVERITY_RUBRIC = `5 Critical (risk to life): live wire on road, open manhole on busy road, major main-pipe burst flooding road, fallen tree blocking highway.
4 High: large pothole on main road, sewage overflow into homes/street, garbage pile near school/hospital, streetlights out on a long stretch.
3 Medium: medium pothole, steady water leak, overflowing community bin, single streetlight out at junction.
2 Low: small crack, minor leak, litter, faded markings.
1 Cosmetic: graffiti, minor aesthetic issues.
Set near_sensitive_site=true if a school, hospital or bus stop is visible or mentioned.`;

const VALIDITY_RULES = `Set is_valid=false (with invalid_reason) when the photo is a selfie, meme, screenshot,
food, blank wall, or otherwise unrelated to a public civic problem and the description does not describe one either.
summary_or must be written in Odia script; summary_hi must be written in Devanagari (Hindi).`;

export const TRANSCRIBE_PROMPT = `Transcribe this audio exactly in its original language and script. Then give an English translation.
Return JSON {"transcript": string, "lang": ISO 639-1 code such as "or", "hi" or "en", "transcript_en": string}.`;

export function triagePrompt(input: TriageInput, schema: string) {
  return `Citizen description (English): ${input.description || "none"}
Original language: ${input.lang}
Nearby context: ${input.locality ?? "unknown"}
Photo attached: ${input.image ? "yes" : "no"}
Allowed categories: ${CATEGORIES.join(", ")}
Severity rubric:
${SEVERITY_RUBRIC}
${VALIDITY_RULES}
JSON schema: ${schema}`;
}

export function sameIssuePrompt(category: Category, distanceM: number, schema: string) {
  return `Image A is an existing complaint, Image B is new. Both are "${category}" within ${Math.round(distanceM)} m.
Do they show the SAME physical problem (same pothole/leak/pile), possibly from a different angle or time?
JSON schema: ${schema}`;
}

export function verifyPrompt(category: Category, summary: string, schema: string) {
  return `BEFORE shows a reported "${category}": ${summary}. AFTER was uploaded by an official claiming it is fixed.
Is it the same location, and is the problem fully resolved? Be strict: partial fixes, debris left,
or a different location = not fixed.
JSON schema: ${schema}`;
}

export function letterPrompt(a: {
  department: string;
  summary: string;
  locality: string | null;
  lat: number;
  lng: number;
  reportCount: number;
  ticket: string;
}) {
  return `Draft a concise formal complaint (at most 120 words) to ${a.department} about: ${a.summary} at ${a.locality ?? "the reported location"} (${a.lat.toFixed(5)}, ${a.lng.toFixed(5)}).
Reported by ${a.reportCount} citizen(s). Ticket ${a.ticket}. Return JSON {"letter": string}.`;
}

export function translatePrompt(text: string) {
  return `Translate this citizen complaint to English. Detect its language.
Return JSON {"transcript": the original text, "lang": ISO 639-1 code, "transcript_en": English translation}.
Text: ${text}`;
}

export const JSON_RETRY_NUDGE = "Your previous reply was not valid JSON for the schema. Return valid JSON only.";
