import { describe, expect, it } from "vitest";
import { formatLeadNumber } from "@/lib/lead-number";

describe("formatLeadNumber", () => {
  it("formats lead numbers with zero-padded sequence", () => {
    expect(formatLeadNumber(2026, 1)).toBe("DA-LEAD-2026-000001");
    expect(formatLeadNumber(2026, 42)).toBe("DA-LEAD-2026-000042");
    expect(formatLeadNumber(2026, 1234567)).toBe("DA-LEAD-2026-1234567");
  });
});
