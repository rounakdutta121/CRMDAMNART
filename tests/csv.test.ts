import { describe, expect, it } from "vitest";
import { escapeCsvValue, toCsv } from "@/lib/csv";

describe("escapeCsvValue", () => {
  it("prefixes formula injection characters with a single quote", () => {
    expect(escapeCsvValue("=1+1")).toBe("'=1+1");
    expect(escapeCsvValue("+1234567890")).toBe("'+1234567890");
    expect(escapeCsvValue("-100")).toBe("'-100");
    expect(escapeCsvValue("@SUM(A1:A2)")).toBe("'@SUM(A1:A2)");
  });

  it("leaves safe values unchanged", () => {
    expect(escapeCsvValue("hello")).toBe("hello");
    expect(escapeCsvValue("user@example.com")).toBe("user@example.com");
  });

  it("quotes values containing commas or newlines", () => {
    expect(escapeCsvValue("hello, world")).toBe('"hello, world"');
  });
});

describe("toCsv", () => {
  it("applies formula protection in exported rows", () => {
    const csv = toCsv(["value"], [["=cmd|' /C calc'!A0"]]);
    expect(csv).toContain("'=cmd|' /C calc'!A0");
  });
});
