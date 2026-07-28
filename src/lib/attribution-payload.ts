import { resolveValueFromPayload } from "@/lib/safe-field-resolver";

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
    gclid: pickString(payload, nested, ["gclid", "GCLID", "attribution.gclid"]),
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
