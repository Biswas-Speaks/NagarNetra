import { DEDUPE_RADIUS_OVERRIDES, DEFAULT_DEDUPE_RADIUS_M, SAME_ISSUE_MIN_CONFIDENCE, type Category } from "./constants";

export function dedupeRadius(category: Category): number {
  return DEDUPE_RADIUS_OVERRIDES[category] ?? DEFAULT_DEDUPE_RADIUS_M;
}

export type DedupeDecision = { action: "create" } | { action: "merge" } | { action: "ask_ai" };

/**
 * §13 steps 2–6, minus the AI call itself. Pure so it can be unit-tested.
 * `aiResult` is supplied on the second pass after `ask_ai`.
 */
export function decideDedupe(args: {
  distanceM: number | null;
  bothHavePhotos: boolean;
  aiResult?: { same_issue: boolean; confidence: number };
}): DedupeDecision {
  const { distanceM, bothHavePhotos, aiResult } = args;
  if (distanceM === null) return { action: "create" };
  if (distanceM <= 15) return { action: "merge" };
  if (bothHavePhotos) {
    if (!aiResult) return { action: "ask_ai" };
    return aiResult.same_issue && aiResult.confidence >= SAME_ISSUE_MIN_CONFIDENCE ? { action: "merge" } : { action: "create" };
  }
  return distanceM <= 30 ? { action: "merge" } : { action: "create" };
}
