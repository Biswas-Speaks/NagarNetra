import { describe, expect, it } from "vitest";
import { decideDedupe, dedupeRadius } from "@/lib/dedupe";

describe("decideDedupe (§13)", () => {
  it("creates when no candidate", () => {
    expect(decideDedupe({ distanceM: null, bothHavePhotos: true })).toEqual({ action: "create" });
  });

  it("merges very close reports without AI", () => {
    expect(decideDedupe({ distanceM: 10, bothHavePhotos: true })).toEqual({ action: "merge" });
  });

  it("asks AI when both have photos and distance > 15 m", () => {
    expect(decideDedupe({ distanceM: 40, bothHavePhotos: true })).toEqual({ action: "ask_ai" });
  });

  it("follows the AI verdict with a 0.6 confidence threshold", () => {
    expect(decideDedupe({ distanceM: 40, bothHavePhotos: true, aiResult: { same_issue: true, confidence: 0.6 } })).toEqual({
      action: "merge",
    });
    expect(decideDedupe({ distanceM: 40, bothHavePhotos: true, aiResult: { same_issue: true, confidence: 0.5 } })).toEqual({
      action: "create",
    });
    expect(decideDedupe({ distanceM: 40, bothHavePhotos: true, aiResult: { same_issue: false, confidence: 0.9 } })).toEqual({
      action: "create",
    });
  });

  it("without photos merges only within 30 m", () => {
    expect(decideDedupe({ distanceM: 25, bothHavePhotos: false })).toEqual({ action: "merge" });
    expect(decideDedupe({ distanceM: 35, bothHavePhotos: false })).toEqual({ action: "create" });
  });
});

describe("dedupeRadius", () => {
  it("applies category overrides", () => {
    expect(dedupeRadius("pothole_road_damage")).toBe(50);
    expect(dedupeRadius("waterlogging_flood")).toBe(150);
    expect(dedupeRadius("air_pollution")).toBe(150);
    expect(dedupeRadius("streetlight")).toBe(30);
  });
});
