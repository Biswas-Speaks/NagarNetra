import "server-only";
import type { Category } from "@/lib/constants";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { gemini } from "./gemini";
import { groq } from "./groq";
import type { AIProvider, AITask, MediaRef, TriageInput } from "./types";

/** §12.1 — provider order: Gemini → Groq. */
const PROVIDERS: AIProvider[] = [gemini, groq];

async function logCall(task: AITask, provider: AIProvider, startedAt: number, error?: unknown) {
  // Best-effort observability (§7); never let logging break a request.
  await getAdminSupabase()
    .from("ai_logs")
    .insert({
      task,
      provider: provider.name,
      model: provider.model(task) ?? null,
      latency_ms: Date.now() - startedAt,
      ok: !error,
      error: error ? String(error instanceof Error ? error.message : error).slice(0, 500) : null,
    })
    .then(
      () => undefined,
      () => undefined,
    );
}

async function withFallback<T>(task: AITask, call: (p: AIProvider) => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (const provider of PROVIDERS) {
    const startedAt = Date.now();
    try {
      const result = await call(provider);
      await logCall(task, provider, startedAt);
      return result;
    } catch (err) {
      lastError = err;
      await logCall(task, provider, startedAt, err);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`All AI providers failed for ${task}`);
}

export const ai = {
  transcribe: (audio: MediaRef) => withFallback("stt", (p) => p.transcribe(audio)),
  triage: (input: TriageInput) => withFallback("triage", (p) => p.triage(input)),
  compareSameIssue: (a: MediaRef, b: MediaRef, category: Category, distanceM: number) =>
    withFallback("dedupe", (p) => p.compareSameIssue(a, b, category, distanceM)),
  verifyFix: (before: MediaRef, after: MediaRef, category: Category, summary: string) =>
    withFallback("verify", (p) => p.verifyFix(before, after, category, summary)),
  complaintLetter: (prompt: string) => withFallback("letter", (p) => p.complaintLetter(prompt)),
};

export type { MediaRef } from "./types";
export type { TriageOutput, VerifyOutput } from "./schemas";
