import { describe, expect, it } from "vitest";
import { extractAttributionFromRawPayload } from "@/lib/attribution-payload";

describe("extractAttributionFromRawPayload", () => {
  it("reads root-level gclid", () => {
    const result = extractAttributionFromRawPayload({
      gclid: "Example GCLID",
      name: "Test",
    });

    expect(result?.gclid).toBe("Example GCLID");
  });

  it("merges nested attribution values", () => {
    const result = extractAttributionFromRawPayload({
      gclid: "root-gclid",
      attribution: {
        utmSource: "google",
        utmMedium: "cpc",
        landingPage: "https://example.com/landing",
      },
    });

    expect(result?.gclid).toBe("root-gclid");
    expect(result?.utmSource).toBe("google");
    expect(result?.utmMedium).toBe("cpc");
    expect(result?.landingPage).toBe("https://example.com/landing");
  });
});
