import type { Category } from "@/lib/constants";
import type { SameIssueOutput, Transcription, TriageOutput, VerifyOutput } from "./schemas";

export interface MediaRef {
  data: Buffer;
  mime: string;
}

export interface TriageInput {
  image?: MediaRef;
  description: string;
  lang: string;
  locality: string | null;
}

export type AITask = "stt" | "triage" | "dedupe" | "verify" | "letter";

/** §12.1 — every provider implements the same contract; index.ts chains them. */
export interface AIProvider {
  name: string;
  model(task: AITask): string | undefined;
  transcribe(audio: MediaRef): Promise<Transcription>;
  triage(input: TriageInput): Promise<TriageOutput>;
  compareSameIssue(a: MediaRef, b: MediaRef, category: Category, distanceM: number): Promise<SameIssueOutput>;
  verifyFix(before: MediaRef, after: MediaRef, category: Category, summary: string): Promise<VerifyOutput>;
  complaintLetter(prompt: string): Promise<string>;
}
