import { describe, expect, it } from "vitest";
import { haversineMeters, inBBox, parseBBox } from "@/lib/geo";
import { isFixAccepted } from "@/lib/resolve";
import { canTransition } from "@/lib/status";
import { TICKET_PATTERN, generateTicketCode } from "@/lib/ticket";

describe("bbox", () => {
  const bbox = parseBBox("85.70,20.18,85.95,20.42");
  it("accepts points inside Bhubaneswar", () => expect(inBBox(20.2961, 85.8245, bbox)).toBe(true));
  it("rejects points outside", () => expect(inBBox(19.07, 72.87, bbox)).toBe(false));
  it("rejects malformed input", () => expect(() => parseBBox("1,2,3")).toThrow());
});

describe("haversineMeters", () => {
  it("is ~0 for the same point and ~111 m per 0.001° latitude", () => {
    expect(haversineMeters(20.3, 85.8, 20.3, 85.8)).toBe(0);
    expect(haversineMeters(20.3, 85.8, 20.301, 85.8)).toBeCloseTo(111.2, 0);
  });
});

describe("ticket codes", () => {
  it("matches NN-<CITY>-XXXX with unambiguous characters", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateTicketCode("bbs");
      expect(code).toMatch(TICKET_PATTERN);
      expect(code.slice(7)).not.toMatch(/[01ILOU]/);
    }
  });
});

describe("canTransition (§11)", () => {
  it("lets officers move forward only", () => {
    expect(canTransition("open", "acknowledged", "officer")).toBe(true);
    expect(canTransition("acknowledged", "in_progress", "officer")).toBe(true);
    expect(canTransition("in_progress", "resolved", "officer")).toBe(false);
    expect(canTransition("resolved", "open", "officer")).toBe(false);
  });
  it("lets AI resolve or reject active incidents only", () => {
    expect(canTransition("in_progress", "resolved", "ai")).toBe(true);
    expect(canTransition("closure_rejected", "closure_rejected", "ai")).toBe(true);
    expect(canTransition("resolved", "resolved", "ai")).toBe(false);
  });
  it("lets citizens reopen resolved incidents", () => {
    expect(canTransition("resolved", "reopened", "citizen")).toBe(true);
    expect(canTransition("open", "reopened", "citizen")).toBe(false);
  });
  it("lets admins override anything except a no-op", () => {
    expect(canTransition("invalid", "open", "admin")).toBe(true);
    expect(canTransition("open", "open", "admin")).toBe(false);
  });
});

describe("isFixAccepted (§12.6)", () => {
  const ok = { fixed: true, same_location: true, confidence: 0.8 };
  it("accepts a confident, same-location fix within 100 m", () => expect(isFixAccepted(ok, 20)).toBe(true));
  it("rejects low confidence", () => expect(isFixAccepted({ ...ok, confidence: 0.69 }, 20)).toBe(false));
  it("rejects a different location", () => expect(isFixAccepted({ ...ok, same_location: false }, 20)).toBe(false));
  it("rejects when too far or GPS missing", () => {
    expect(isFixAccepted(ok, 150)).toBe(false);
    expect(isFixAccepted(ok, null)).toBe(false);
  });
});
