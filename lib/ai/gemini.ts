import "server-only";
import type { z } from "zod";
import { serverEnv } from "@/lib/env/server";
import { askJson, fetchWithRetry } from "./http";
import { JSON_RETRY_NUDGE, SYSTEM_PROMPT, TRANSCRIBE_PROMPT, sameIssuePrompt, triagePrompt, verifyPrompt } from "./prompts";
import {
  LetterSchema,
  SameIssueSchema,
  TranscriptionSchema,
  TriageSchema,
  VerifySchema,
  parseModelJson,
  schemaHint,
} from "./schemas";
import type { AIProvider, MediaRef } from "./types";

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

const media = (m: MediaRef): Part => ({ inlineData: { mimeType: m.mime, data: m.data.toString("base64") } });

async function generate<T>(parts: Part[], schema: z.ZodType<T>): Promise<T> {
  const { GEMINI_API_KEY, GEMINI_MODEL } = serverEnv();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;

  return askJson(
    async (isRetry) => {
      const res = await fetchWithRetry(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: isRetry ? [...parts, { text: JSON_RETRY_NUDGE }] : parts }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        }),
      });
      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      return json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    },
    (text) => parseModelJson(text, schema),
  );
}

export const gemini: AIProvider = {
  name: "gemini",
  model: () => serverEnv().GEMINI_MODEL,

  transcribe: (audio) => generate([{ text: TRANSCRIBE_PROMPT }, media(audio)], TranscriptionSchema),

  triage: (input) =>
    generate(
      [{ text: triagePrompt(input, schemaHint(TriageSchema)) }, ...(input.image ? [media(input.image)] : [])],
      TriageSchema,
    ),

  compareSameIssue: (a, b, category, distanceM) =>
    generate(
      [
        { text: sameIssuePrompt(category, distanceM, schemaHint(SameIssueSchema)) },
        { text: "Image A:" },
        media(a),
        { text: "Image B:" },
        media(b),
      ],
      SameIssueSchema,
    ),

  verifyFix: (before, after, category, summary) =>
    generate(
      [
        { text: verifyPrompt(category, summary, schemaHint(VerifySchema)) },
        { text: "BEFORE:" },
        media(before),
        { text: "AFTER:" },
        media(after),
      ],
      VerifySchema,
    ),

  complaintLetter: async (prompt) => (await generate([{ text: prompt }], LetterSchema)).letter,
};
