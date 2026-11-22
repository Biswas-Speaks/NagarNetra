import { describe, expect, it } from "vitest";
import { adjustSeverity, computePriority, slaDueAt } from "@/lib/priority";

const now = new Date("2026-11-22T12:00:00Z");

describe("computePriority (§14)", () => {
  it("scores a fresh single report by severity only", () => {
    expect(computePriority({ severity: 3, report_count: 1, risk_to_life: false, created_at: now, status: "open" }, now)).toBe(60);
  });

  it("adds report weight, risk, age and rejected-closure bonus", () => {
    const created = new Date(now.getTime() - 48 * 3_600_000);
    const score = computePriority(
      { severity: 4, report_count: 4, risk_to_life: true, created_at: created, status: "closure_rejected" },
      now,
    );
    // 80 + 3*4 + 25 + (48/24)*2 + 10
    expect(score).toBe(131);
  });

  it("caps report count and age contributions", () => {
    const created = new Date(now.getTime() - 100 * 24 * 3_600_000);
    const score = computePriority(
      { severity: 5, report_count: 50, risk_to_life: true, created_at: created, status: "closure_rejected" },
      now,
    );
    expect(score).toBe(100 + 40 + 25 + 20 + 10);
  });
});

describe("slaDueAt (§15)", () => {
  it("uses department SLA, halved for severity 5", () => {
    const created = new Date("2026-01-01T00:00:00Z");
    expect(slaDueAt(created, 24, 3).toISOString()).toBe("2026-01-02T00:00:00.000Z");
    expect(slaDueAt(created, 24, 5).toISOString()).toBe("2026-01-01T12:00:00.000Z");
  });
});

describe("adjustSeverity (§12.4)", () => {
  it("upgrades by one when risky or near a sensitive site, max 5", () => {
    expect(adjustSeverity(3, false, false)).toBe(3);
    expect(adjustSeverity(3, true, false)).toBe(4);
    expect(adjustSeverity(3, false, true)).toBe(4);
    expect(adjustSeverity(5, true, true)).toBe(5);
  });
});
