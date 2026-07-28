import { describe, expect, it } from "vitest";
import { logger } from "@/lib/logger";

describe("logger redaction", () => {
  it("redacts sensitive keys in structured payloads", () => {
    const lines: string[] = [];
    const original = console.log;
    console.log = (value: string) => {
      lines.push(value);
    };

    try {
      logger.info("test-event", {
        email: "user@example.com",
        password: "secret-value",
        nested: { apiKey: "abc", safe: "visible" },
      });
    } finally {
      console.log = original;
    }

    const output = lines.join("\n");
    expect(output).toContain("[REDACTED]");
    expect(output).not.toContain("user@example.com");
    expect(output).not.toContain("secret-value");
    expect(output).toContain("visible");
  });
});
