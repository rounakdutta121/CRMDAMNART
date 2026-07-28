import { describe, expect, it } from "vitest";
import { createFieldDefinition, validateFormSchema } from "@/lib/form-schema";

describe("validateFormSchema", () => {
  it("reports duplicate incoming keys", () => {
    const fields = [
      createFieldDefinition({
        incomingKey: "email",
        label: "Email",
        fieldType: "email",
        canonicalTarget: "contact.email",
      }),
      createFieldDefinition({
        incomingKey: "email",
        label: "Work Email",
        fieldType: "email",
        canonicalTarget: "contact.email",
      }),
    ];

    const issues = validateFormSchema(fields);
    expect(issues.some((issue) => issue.message.includes("Duplicate incoming key"))).toBe(
      true
    );
  });

  it("reports required fields mapped to ignore", () => {
    const fields = [
      createFieldDefinition({
        incomingKey: "honeypot",
        label: "Honeypot",
        fieldType: "text",
        canonicalTarget: "ignore",
        required: true,
      }),
    ];

    const issues = validateFormSchema(fields);
    expect(
      issues.some((issue) => issue.message === "Required fields cannot be mapped to ignore.")
    ).toBe(true);
  });

  it("reports sensitive fields shown on lead list", () => {
    const fields = [
      createFieldDefinition({
        incomingKey: "ssn",
        label: "SSN",
        fieldType: "text",
        canonicalTarget: "custom",
        sensitive: true,
        showOnLeadList: true,
      }),
    ];

    const issues = validateFormSchema(fields);
    expect(
      issues.some(
        (issue) => issue.message === "Sensitive fields cannot appear on the lead list."
      )
    ).toBe(true);
  });
});
