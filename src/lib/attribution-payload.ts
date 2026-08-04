import { resolveValueFromPayload } from "@/lib/safe-field-resolver";
import type { LeadFormFieldValue } from "@/types/form";

export interface ExtractedAttribution {
  sessionId?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  msclkid?: string;
  fbclid?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  landingPage?: string;
  formPage?: string;
  pageUrl?: string;
  referrer?: string;
}

function pickString(
  payload: Record<string, unknown>,
  nested: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = key.includes(".")
      ? resolveValueFromPayload(payload, key)
      : payload[key] ?? nested[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function collectStringCandidates(
  payload: Record<string, unknown>,
  nested: Record<string, unknown>,
  keys: string[]
): string[] {
  const values: string[] = [];
  for (const key of keys) {
    const value = key.includes(".")
      ? resolveValueFromPayload(payload, key)
      : payload[key] ?? nested[key];

    if (typeof value === "string" && value.trim().length > 0) {
      const trimmed = value.trim();
      if (!values.includes(trimmed)) {
        values.push(trimmed);
      }
    }
  }
  return values;
}

/**
 * n8n / form payloads sometimes send a GCLID split across `gclid` and
 * `attribution.gclid` (flat dotted key). Prefer the longest complete value,
 * otherwise concatenate complementary halves.
 */
export function coalesceGclidParts(
  parts: Array<string | null | undefined>
): string | null {
  const unique: string[] = [];

  for (const part of parts) {
    const trimmed = part?.trim();
    if (!trimmed) continue;

    if (unique.some((existing) => existing === trimmed)) {
      continue;
    }
    if (unique.some((existing) => existing.includes(trimmed))) {
      continue;
    }

    const containedIndex = unique.findIndex((existing) =>
      trimmed.includes(existing)
    );
    if (containedIndex >= 0) {
      unique[containedIndex] = trimmed;
      continue;
    }

    unique.push(trimmed);
  }

  if (unique.length === 0) {
    return null;
  }
  if (unique.length === 1) {
    return unique[0]!;
  }

  const ordered = [...unique].sort((a, b) => {
    const score = (value: string) => (/^(Cj|EA)/i.test(value) ? 0 : 1);
    return score(a) - score(b);
  });

  return ordered.join("");
}

export function gclidPartsFromFormFields(
  fields?: LeadFormFieldValue[]
): string[] {
  if (!fields?.length) {
    return [];
  }

  const parts: string[] = [];
  for (const field of fields) {
    const isGclid =
      field.canonicalTarget === "attribution.gclid" ||
      field.incomingKey === "gclid" ||
      field.incomingKey === "GCLID" ||
      field.incomingKey === "attribution.gclid";

    if (!isGclid || typeof field.value !== "string") {
      continue;
    }

    const trimmed = field.value.trim();
    if (trimmed && !parts.includes(trimmed)) {
      parts.push(trimmed);
    }
  }

  return parts;
}

export function extractAttributionFromRawPayload(
  payload: Record<string, unknown>
): ExtractedAttribution | undefined {
  const nested =
    payload.attribution &&
    typeof payload.attribution === "object" &&
    !Array.isArray(payload.attribution)
      ? (payload.attribution as Record<string, unknown>)
      : {};

  const extracted: ExtractedAttribution = {
    sessionId: pickString(payload, nested, [
      "sessionId",
      "session_id",
      "attribution.sessionId",
    ]),
    gclid:
      coalesceGclidParts(
        collectStringCandidates(payload, nested, [
          "gclid",
          "GCLID",
          "attribution.gclid",
        ])
      ) ?? undefined,
    gbraid: pickString(payload, nested, ["gbraid", "attribution.gbraid"]),
    wbraid: pickString(payload, nested, ["wbraid", "attribution.wbraid"]),
    msclkid: pickString(payload, nested, ["msclkid", "attribution.msclkid"]),
    fbclid: pickString(payload, nested, ["fbclid", "attribution.fbclid"]),
    utmSource: pickString(payload, nested, [
      "utmSource",
      "utm_source",
      "attribution.utmSource",
    ]),
    utmMedium: pickString(payload, nested, [
      "utmMedium",
      "utm_medium",
      "attribution.utmMedium",
    ]),
    utmCampaign: pickString(payload, nested, [
      "utmCampaign",
      "utm_campaign",
      "attribution.utmCampaign",
    ]),
    utmTerm: pickString(payload, nested, [
      "utmTerm",
      "utm_term",
      "attribution.utmTerm",
    ]),
    utmContent: pickString(payload, nested, [
      "utmContent",
      "utm_content",
      "attribution.utmContent",
    ]),
    landingPage: pickString(payload, nested, [
      "landingPage",
      "landing_page",
      "attribution.landingPage",
    ]),
    formPage: pickString(payload, nested, [
      "formPage",
      "form_page",
      "attribution.formPage",
    ]),
    pageUrl: pickString(payload, nested, [
      "pageUrl",
      "page_url",
      "attribution.pageUrl",
    ]),
    referrer: pickString(payload, nested, ["referrer", "attribution.referrer"]),
  };

  const hasValue = Object.values(extracted).some(
    (value) => typeof value === "string" && value.length > 0
  );

  return hasValue ? extracted : undefined;
}

export function hasExtractedAttributionData(
  attribution: ExtractedAttribution | undefined
): boolean {
  if (!attribution) {
    return false;
  }

  return Object.values(attribution).some(
    (value) => typeof value === "string" && value.trim().length > 0
  );
}
