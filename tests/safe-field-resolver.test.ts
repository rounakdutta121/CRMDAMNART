import { describe, expect, it } from "vitest";
import {
  collectPayloadFieldNames,
  flattenPayload,
  isSafeFieldKey,
  resolveFieldValue,
  resolveValueFromPayload,
} from "@/lib/safe-field-resolver";

describe("isSafeFieldKey", () => {
  it("accepts normal field keys", () => {
    expect(isSafeFieldKey("email")).toBe(true);
    expect(isSafeFieldKey("contact.name")).toBe(true);
  });

  it("blocks dangerous keys", () => {
    expect(isSafeFieldKey("__proto__")).toBe(false);
    expect(isSafeFieldKey("prototype")).toBe(false);
    expect(isSafeFieldKey("constructor")).toBe(false);
    expect(isSafeFieldKey("$where")).toBe(false);
    expect(isSafeFieldKey("field[0]")).toBe(false);
    expect(isSafeFieldKey("")).toBe(false);
  });
});

describe("resolveValueFromPayload", () => {
  it("resolves nested dot-path values", () => {
    const payload = { contact: { name: "Ada Lovelace" } };
    expect(resolveValueFromPayload(payload, "contact.name")).toBe("Ada Lovelace");
  });

  it("returns undefined for unsafe keys", () => {
    expect(resolveValueFromPayload({ email: "a@b.com" }, "__proto__")).toBeUndefined();
  });
});

describe("resolveFieldValue", () => {
  it("resolves aliases when the primary key is missing", () => {
    const payload = { mobile: "+15551234567" };
    expect(resolveFieldValue(payload, "phone", ["mobile", "Phone-Number"])).toBe(
      "+15551234567"
    );
  });

  it("prefers the primary incoming key over aliases", () => {
    const payload = { phone: "111", mobile: "222" };
    expect(resolveFieldValue(payload, "phone", ["mobile"])).toBe("111");
  });
});

describe("collectPayloadFieldNames", () => {
  it("flattens attribution object keys", () => {
    const payload = {
      email: "user@example.com",
      attribution: {
        utmSource: "google",
        gclid: "abc123",
      },
    };

    expect(collectPayloadFieldNames(payload).sort()).toEqual(
      ["attribution.gclid", "attribution.utmSource", "email"].sort()
    );
  });
});

describe("flattenPayload", () => {
  it("adds attribution fields to the top level", () => {
    const payload = {
      email: "user@example.com",
      attribution: {
        utmSource: "google",
        gclid: "abc123",
      },
    };

    const flattened = flattenPayload(payload);

    expect(flattened["attribution.utmSource"]).toBe("google");
    expect(flattened.utmSource).toBe("google");
    expect(flattened.email).toBe("user@example.com");
  });
});
