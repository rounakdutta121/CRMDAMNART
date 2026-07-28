import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { createFieldDefinition } from "@/lib/form-schema";
import {
  FormSubmissionMappingError,
  mapFormSubmission,
} from "@/services/form-submission-mapper.service";
import type { WebsiteForm } from "@/types/form";

function createTestForm(
  overrides: Partial<WebsiteForm> = {}
): WebsiteForm {
  const now = new Date();
  return {
    _id: new ObjectId(),
    websiteId: new ObjectId(),
    name: "Test Form",
    code: "test-form",
    fields: [
      createFieldDefinition({
        incomingKey: "name",
        aliases: ["fullName", "full_name"],
        label: "Name",
        fieldType: "text",
        canonicalTarget: "contact.name",
        required: false,
        order: 1,
      }),
      createFieldDefinition({
        incomingKey: "firstName",
        label: "First Name",
        fieldType: "text",
        canonicalTarget: "contact.firstName",
        required: false,
        order: 2,
      }),
      createFieldDefinition({
        incomingKey: "lastName",
        label: "Last Name",
        fieldType: "text",
        canonicalTarget: "contact.lastName",
        required: false,
        order: 3,
      }),
      createFieldDefinition({
        incomingKey: "email",
        label: "Email",
        fieldType: "email",
        canonicalTarget: "contact.email",
        required: false,
        order: 4,
        normalizeValue: true,
      }),
      createFieldDefinition({
        incomingKey: "phone",
        aliases: ["mobile", "Phone-Number"],
        label: "Phone",
        fieldType: "phone",
        canonicalTarget: "contact.phone",
        required: false,
        order: 5,
        normalizeValue: true,
      }),
      createFieldDefinition({
        incomingKey: "message",
        aliases: ["query"],
        label: "Message",
        fieldType: "textarea",
        canonicalTarget: "lead.message",
        required: false,
        order: 6,
      }),
      createFieldDefinition({
        incomingKey: "service",
        aliases: ["inquiryType"],
        label: "Service",
        fieldType: "text",
        canonicalTarget: "lead.service",
        required: false,
        order: 7,
      }),
      createFieldDefinition({
        incomingKey: "budget",
        label: "Budget",
        fieldType: "text",
        canonicalTarget: "custom",
        required: false,
        order: 8,
      }),
      createFieldDefinition({
        incomingKey: "utm_campaign",
        label: "UTM Campaign",
        fieldType: "hidden",
        canonicalTarget: "ignore",
        required: false,
        order: 9,
      }),
    ],
    schemaVersion: 1,
    schemaMode: "dynamic",
    unknownFieldPolicy: "ignore",
    contactIdentityRule: "email_or_phone",
    attributionEnabled: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("mapFormSubmission", () => {
  it("maps mobile alias to contact.phone", () => {
    const form = createTestForm();
    const result = mapFormSubmission(
      { mobile: "+1 (555) 111-2222", email: "user@example.com" },
      form
    );

    expect(result.contactData.phone).toBe("+15551112222");
  });

  it("maps Phone-Number alias to contact.phone", () => {
    const form = createTestForm();
    const result = mapFormSubmission(
      { "Phone-Number": "5553334444", email: "user@example.com" },
      form
    );

    expect(result.contactData.phone).toBe("5553334444");
  });

  it("maps fullName alias to contact.name", () => {
    const form = createTestForm();
    const result = mapFormSubmission(
      { fullName: "Jane Doe", email: "jane@example.com" },
      form
    );

    expect(result.contactData.name).toBe("Jane Doe");
  });

  it("maps query alias to lead.message", () => {
    const form = createTestForm();
    const result = mapFormSubmission(
      { query: "Need a quote", email: "user@example.com" },
      form
    );

    expect(result.leadData.message).toBe("Need a quote");
  });

  it("maps inquiryType alias to lead.service", () => {
    const form = createTestForm();
    const result = mapFormSubmission(
      { inquiryType: "Web Design", email: "user@example.com" },
      form
    );

    expect(result.leadData.service).toBe("Web Design");
  });

  it("stores field snapshots for mapped and custom values", () => {
    const form = createTestForm({
      fields: [
        ...createTestForm().fields,
        createFieldDefinition({
          incomingKey: "budget",
          label: "Budget",
          fieldType: "text",
          canonicalTarget: "custom",
          order: 99,
        }),
      ],
    });
    const result = mapFormSubmission(
      { budget: "$5000", email: "user@example.com" },
      form
    );

    expect(result.customFieldValues.length).toBeGreaterThanOrEqual(2);
    const budget = result.customFieldValues.find(
      (field) => field.incomingKey === "budget"
    );
    expect(budget?.value).toBe("$5000");
    expect(budget?.canonicalTarget).toBe("custom");

    const email = result.customFieldValues.find(
      (field) => field.incomingKey === "email"
    );
    expect(email?.canonicalTarget).toBe("contact.email");
  });

  it("tracks ignored fields", () => {
    const form = createTestForm();
    const result = mapFormSubmission(
      { utm_campaign: "spring-sale", email: "user@example.com" },
      form
    );

    expect(result.ignoredFieldNames).toContain("utm_campaign");
  });

  it("rejects unknown fields when policy is reject", () => {
    const form = createTestForm({ unknownFieldPolicy: "reject" });

    expect(() =>
      mapFormSubmission({ email: "user@example.com", unknownField: "value" }, form)
    ).toThrow(FormSubmissionMappingError);
  });

  it("enforces email_or_phone identity rule", () => {
    const form = createTestForm({ contactIdentityRule: "email_or_phone" });

    expect(() => mapFormSubmission({ fullName: "Jane Doe" }, form)).toThrow(
      FormSubmissionMappingError
    );

    try {
      mapFormSubmission({ fullName: "Jane Doe" }, form);
    } catch (error) {
      expect(error).toBeInstanceOf(FormSubmissionMappingError);
      const mappingError = error as FormSubmissionMappingError;
      expect(mappingError.errors.some((e) => e.message.includes("email or phone"))).toBe(
        true
      );
    }
  });

  it("combines first and last name when name is absent", () => {
    const form = createTestForm();
    const result = mapFormSubmission(
      {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
      },
      form
    );

    expect(result.contactData.firstName).toBe("Jane");
    expect(result.contactData.lastName).toBe("Doe");
    expect(result.contactData.name).toBe("Jane Doe");
  });

  it("normalizes email when normalizeValue is enabled", () => {
    const form = createTestForm();
    const result = mapFormSubmission(
      { email: "  User@Example.COM  ", phone: "5551234567" },
      form
    );

    expect(result.contactData.email).toBe("user@example.com");
  });
});
