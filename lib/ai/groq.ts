import "server-only";
import type { z } from "zod";
import { serverEnv } from "@/lib/env/server";
import { askJson, fetchWithRetry } from "./http";
import { JSON_RETRY_NUDGE, SYSTEM_PROMPT, sameIssuePrompt, translatePrompt, triagePrompt, verifyPrompt } from "./prompts";
import {
  LetterSchema,
  SameIssueSchema,
  TranscriptionSchema,
  TriageSchema,
  VerifySchema,
  parseModelJson,
  schemaHint,
} from "./schemas";
import type { AIProvider, AITask, MediaRef } from "./types";

const BASE = "https://api.groq.com/openai/v1";

type Content = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

const image = (m: MediaRef): Content => ({
  type: "image_url",
  image_url: { url: `data:${m.mime};base64,${m.data.toString("base64")}` },
});

/** Whisper returns language names; normalise the ones we care about to ISO 639-1. */
const LANG_CODES: Record<string, string> = { english: "en", hindi: "hi", odia: "or", oriya: "or", bengali: "bn" };

function requireKey() {
  const key = serverEnv().GROQ_API_KEY;
  if (!key) throw new Error("Groq fallback not configured (GROQ_API_KEY missing)");
  return key;
}

async function chat<T>(content: Content[], schema: z.ZodType<T>, vision: boolean): Promise<T> {
  const env = serverEnv();
  const key = requireKey();
  const model = vision ? env.GROQ_VISION_MODEL : env.GROQ_TEXT_MODEL;
  if (!model) throw new Error("Groq vision model not configured (GROQ_VISION_MODEL missing)");

  return askJson(
    async (isRetry) => {
      const res = await fetchWithRetry(`${BASE}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: isRetry ? [...content, { type: "text", text: JSON_RETRY_NUDGE }] : content },
          ],
        }),
      });
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return json.choices?.[0]?.message?.content ?? "";
    },
    (text) => parseModelJson(text, schema),
  );
}

export const groq: AIProvider = {
  name: "groq",
  model: (task: AITask) => {
    const env = serverEnv();
    if (task === "stt") return env.GROQ_STT_MODEL;
    if (task === "letter") return env.GROQ_TEXT_MODEL;
    return env.GROQ_VISION_MODEL;
  },

  /** Whisper STT, then an LLM pass to translate to English (§12.2 fallback). */
  async transcribe(audio) {
    const key = requireKey();
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(audio.data)], { type: audio.mime }), "voice.webm");
    form.append("model", serverEnv().GROQ_STT_MODEL);
    form.append("response_format", "verbose_json");
    const res = await fetchWithRetry(`${BASE}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    const stt = (await res.json()) as { text?: string; language?: string };
    const text = stt.text?.trim() ?? "";
    const lang = LANG_CODES[stt.language?.toLowerCase() ?? ""] ?? stt.language?.slice(0, 2) ?? "en";
    if (!text || lang === "en") return { transcript: text, lang, transcript_en: text };
    const translated = await chat([{ type: "text", text: translatePrompt(text) }], TranscriptionSchema, false);
    return { transcript: text, lang, transcript_en: translated.transcript_en };
  },

  triage: (input) =>
    chat(
      [{ type: "text", text: triagePrompt(input, schemaHint(TriageSchema)) }, ...(input.image ? [image(input.image)] : [])],
      TriageSchema,
      Boolean(input.image),
    ),

  compareSameIssue: (a, b, category, distanceM) =>
    chat(
      [
        { type: "text", text: sameIssuePrompt(category, distanceM, schemaHint(SameIssueSchema)) },
        { type: "text", text: "Image A:" },
        image(a),
        { type: "text", text: "Image B:" },
        image(b),
      ],
      SameIssueSchema,
      true,
    ),

  verifyFix: (before, after, category, summary) =>
    chat(
      [
        { type: "text", text: verifyPrompt(category, summary, schemaHint(VerifySchema)) },
        { type: "text", text: "BEFORE:" },
        image(before),
        { type: "text", text: "AFTER:" },
        image(after),
      ],
      VerifySchema,
      true,
    ),

  complaintLetter: async (prompt) => (await chat([{ type: "text", text: prompt }], LetterSchema, false)).letter,
};
