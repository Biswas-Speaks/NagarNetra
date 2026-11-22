import { describe, expect, it } from "vitest";
import { TriageSchema, VerifySchema, parseModelJson } from "@/lib/ai/schemas";
import en from "@/lib/i18n/en.json";
import hi from "@/lib/i18n/hi.json";
import or from "@/lib/i18n/or.json";

const validTriage = {
  is_valid: true,
  category: "pothole_road_damage",
  severity: 4,
  severity_reason: "Large pothole on a main road",
  risk_to_life: false,
  near_sensitive_site: true,
  title_en: "Pothole near bus stop",
  summary_en: "A large pothole near the bus stop.",
  summary_or: "ବସ୍ ଷ୍ଟପ୍ ପାଖରେ ବଡ଼ ଗାତ।",
  summary_hi: "बस स्टॉप के पास बड़ा गड्ढा।",
  visible_details: ["pothole ~1m wide"],
  confidence: 0.92,
};

describe("TriageSchema (§12.3)", () => {
  it("parses a valid reply wrapped in a code fence", () => {
    const text = "```json\n" + JSON.stringify(validTriage) + "\n```";
    expect(parseModelJson(text, TriageSchema).category).toBe("pothole_road_damage");
  });

  it("falls back to 'other' for unknown categories and clamps numbers", () => {
    const out = TriageSchema.parse({ ...validTriage, category: "alien_invasion", severity: 9, confidence: 1.4 });
    expect(out.category).toBe("other");
    expect(out.severity).toBe(5);
    expect(out.confidence).toBe(1);
  });

  it("truncates overlong text instead of failing", () => {
    const out = TriageSchema.parse({
      ...validTriage,
      title_en: "x".repeat(200),
      visible_details: ["a", "b", "c", "d", "e", "f"],
    });
    expect(out.title_en).toHaveLength(60);
    expect(out.visible_details).toHaveLength(5);
  });

  it("rejects replies missing required fields", () => {
    const missing: Partial<typeof validTriage> = { ...validTriage };
    delete missing.is_valid;
    expect(() => TriageSchema.parse(missing)).toThrow();
  });

  it("throws on non-JSON replies", () => {
    expect(() => parseModelJson("Sorry, I cannot help", TriageSchema)).toThrow();
  });
});

describe("VerifySchema (§12.6)", () => {
  it("defaults remaining_issues and caps it at 3", () => {
    expect(VerifySchema.parse({ fixed: true, confidence: 0.9, same_location: true, reason: "ok" }).remaining_issues).toEqual([]);
    expect(
      VerifySchema.parse({
        fixed: false,
        confidence: 0.9,
        same_location: true,
        reason: "x",
        remaining_issues: ["a", "b", "c", "d"],
      }).remaining_issues,
    ).toHaveLength(3);
  });
});

describe("i18n dictionaries (§FR-7)", () => {
  const keys = Object.keys(en).sort();
  it("Odia has every English key", () => expect(Object.keys(or).sort()).toEqual(keys));
  it("Hindi has every English key", () => expect(Object.keys(hi).sort()).toEqual(keys));
});
