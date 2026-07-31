import { ObjectId } from "mongodb";
import { ApiError } from "@/lib/api-auth";
import {
  extractAttributionFromRawPayload,
} from "@/lib/attribution-payload";
import { verifyApiKey } from "@/lib/crypto";
import { getServerEnv } from "@/lib/env";
import { generateLeadNumber } from "@/lib/lead-number";
import { normalizeOptionalString } from "@/lib/normalization";
import {
  assertCanAssignLeadToUser,
  canReceiveLeadForWebsite,
} from "@/lib/permissions";
import { consumeRateLimit } from "@/lib/rate-limit";
import { collectPayloadFieldNames } from "@/lib/safe-field-resolver";
import {
  webhookLeadSchema,
  type WebhookLeadInput,
} from "@/lib/validation/webhook.schema";
import { createActivity } from "@/repositories/activities.repository";
import { createAttribution } from "@/repositories/attributions.repository";
import {
  createIdempotencyRecord,
  findIdempotencyRecord,
} from "@/repositories/idempotency.repository";
import {
  findFormByCode,
  findFormById,
  findFormByName,
  findLegacyDefaultForm,
} from "@/repositories/forms.repository";
import { createIntegrationLog } from "@/repositories/integration-logs.repository";
import { createLead, findLeadByExternalSubmission } from "@/repositories/leads.repository";
import {
  findServiceByCode,
  findServiceById,
  listServicesForWebsite,
} from "@/repositories/services.repository";
import { findUserById } from "@/repositories/users.repository";
import { notifyNewLead } from "@/repositories/notifications.repository";
import { findWebsiteByWebhookKey } from "@/repositories/websites.repository";
import { findOrCreateContact } from "@/services/contacts.service";
import {
  FormSubmissionMappingError,
  mapFormSubmission,
} from "@/services/form-submission-mapper.service";
import type { CRMService } from "@/types/service";
import type { WebsiteForm } from "@/types/form";
import type { LeadFormFieldValue } from "@/types/form";
import type { IntegrationLog, IntegrationLogStatus } from "@/types/integration-log";
import type {
  ConsentStatus,
  LeadPriority,
  SourceSystem,
} from "@/types/lead";
import type { Website } from "@/types/website";

export interface WebhookResult {
  leadId: string;
  contactId: string;
  leadNumber: string;
  idempotentReplay: boolean;
}

export interface IngestWebhookLeadOptions {
  websiteKey: string;
  apiKey: string | null;
  idempotencyKey: string | null;
  formCode?: string | null;
  headerFormCode?: string | null;
  rawPayload: Record<string, unknown>;
  endpoint: string;
  requestMethod?: string;
}

const METADATA_KEYS = new Set([
  "sourceSystem",
  "formCode",
  "formId",
  "formName",
  "externalSubmissionId",
  "isTestLead",
  "serviceId",
  "serviceCode",
  "assignedUserId",
  "consentStatus",
  "privacyPolicyVersion",
  "attribution",
]);

function coerceBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
  }
  return undefined;
}

function stripMetadataForMapping(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const stripped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!METADATA_KEYS.has(key)) {
      stripped[key] = value;
    }
  }
  return stripped;
}

function hasAttributionData(
  attribution: WebhookLeadInput["attribution"] | ReturnType<typeof extractAttributionFromRawPayload>
): boolean {
  if (!attribution) {
    return false;
  }
  return Object.values(attribution).some(
    (value) => typeof value === "string" && value.trim().length > 0
  );
}

async function createLeadAttributionRecord(options: {
  leadId: ObjectId;
  contactId: ObjectId;
  websiteId: ObjectId;
  attribution: NonNullable<ReturnType<typeof extractAttributionFromRawPayload>>;
  capturedAt?: Date;
}): Promise<void> {
  const attr = options.attribution;
  const capturedAt = options.capturedAt ?? new Date();

  await createAttribution({
    leadId: options.leadId,
    contactId: options.contactId,
    websiteId: options.websiteId,
    sessionId: normalizeOptionalString(attr.sessionId),
    gclid: normalizeOptionalString(attr.gclid),
    gbraid: normalizeOptionalString(attr.gbraid),
    wbraid: normalizeOptionalString(attr.wbraid),
    msclkid: normalizeOptionalString(attr.msclkid),
    fbclid: normalizeOptionalString(attr.fbclid),
    utmSource: normalizeOptionalString(attr.utmSource),
    utmMedium: normalizeOptionalString(attr.utmMedium),
    utmCampaign: normalizeOptionalString(attr.utmCampaign),
    utmTerm: normalizeOptionalString(attr.utmTerm),
    utmContent: normalizeOptionalString(attr.utmContent),
    landingPage: normalizeOptionalString(attr.landingPage),
    formPage: normalizeOptionalString(attr.formPage),
    pageUrl: normalizeOptionalString(attr.pageUrl),
    referrer: normalizeOptionalString(attr.referrer),
    touchType: "submission",
    capturedAt,
  });
}

function tryMapLegacyFormSubmission(
  form: WebsiteForm,
  rawPayload: Record<string, unknown>
): {
  formFieldValues?: LeadFormFieldValue[];
  attributionData: ReturnType<typeof mapFormSubmission>["attributionData"];
} | null {
  if (!form.fields.some((field) => field.active)) {
    return null;
  }

  try {
    const mapped = mapFormSubmission(
      stripMetadataForMapping(rawPayload),
      form
    );
    return {
      formFieldValues: mapped.customFieldValues,
      attributionData: mapped.attributionData,
    };
  } catch {
    return null;
  }
}

function mergeAttributionSources(
  ...sources: Array<
    | WebhookLeadInput["attribution"]
    | ReturnType<typeof extractAttributionFromRawPayload>
    | ReturnType<typeof mapFormSubmission>["attributionData"]
    | undefined
  >
): ReturnType<typeof extractAttributionFromRawPayload> | undefined {
  const merged: Record<string, string> = {};

  for (const source of sources) {
    if (!source) {
      continue;
    }

    for (const [key, value] of Object.entries(source)) {
      if (key === "submittedAt") {
        continue;
      }
      if (typeof value === "string" && value.trim().length > 0) {
        merged[key] = value.trim();
      }
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

async function resolveForm(options: {
  websiteId: string;
  routeFormCode?: string | null;
  headerFormCode?: string | null;
  payload: Record<string, unknown>;
}): Promise<WebsiteForm | null> {
  const websiteId = options.websiteId;
  const bodyFormCode = normalizeOptionalString(
    options.payload.formCode as string | undefined
  );
  const bodyFormId = normalizeOptionalString(
    options.payload.formId as string | undefined
  );
  const bodyFormName = normalizeOptionalString(
    options.payload.formName as string | undefined
  );

  const candidates = [
    normalizeOptionalString(options.routeFormCode ?? undefined),
    normalizeOptionalString(options.headerFormCode ?? undefined),
    bodyFormCode,
  ].filter((value): value is string => Boolean(value));

  for (const code of candidates) {
    const form = await findFormByCode(websiteId, code);
    if (form?.isActive) {
      return form;
    }
  }

  if (bodyFormId) {
    const form = await findFormById(bodyFormId);
    if (
      form &&
      form.isActive &&
      form.websiteId.toHexString() === websiteId
    ) {
      return form;
    }
  }

  if (bodyFormName) {
    const form = await findFormByName(websiteId, bodyFormName);
    if (form) {
      return form;
    }
  }

  return findLegacyDefaultForm(websiteId);
}

async function resolveCrmService(options: {
  websiteId: string;
  serviceId?: string;
  serviceCode?: string;
  submittedServiceName?: string;
}): Promise<CRMService | null> {
  const belongsToWebsite = (service: CRMService) =>
    service.websiteIds.some((id) => id.toHexString() === options.websiteId);

  if (options.serviceId) {
    const service = await findServiceById(options.serviceId);
    if (service?.isActive && belongsToWebsite(service)) {
      return service;
    }
  }

  if (options.serviceCode) {
    const service = await findServiceByCode(options.serviceCode);
    if (service?.isActive && belongsToWebsite(service)) {
      return service;
    }
  }

  if (options.submittedServiceName) {
    const normalized = options.submittedServiceName.trim().toLowerCase();
    const services = await listServicesForWebsite(options.websiteId, {
      isActive: true,
    });
    return (
      services.find(
        (service) =>
          service.name.toLowerCase() === normalized ||
          service.code.toLowerCase() === normalized
      ) ?? null
    );
  }

  return null;
}

async function resolveAssignedUserId(options: {
  explicitAssignedUserId?: string;
  form?: WebsiteForm | null;
  service?: CRMService | null;
  website: Website;
}): Promise<ObjectId | undefined> {
  if (options.explicitAssignedUserId) {
    const user = await findUserById(options.explicitAssignedUserId);
    assertCanAssignLeadToUser(user, options.website._id);
    return user!._id;
  }

  if (options.form?.defaultLeadOwnerId) {
    const user = await findUserById(
      options.form.defaultLeadOwnerId.toHexString()
    );
    if (user && canReceiveLeadForWebsite(user, options.website._id)) {
      return options.form.defaultLeadOwnerId;
    }
  }

  if (options.service?.defaultLeadOwnerId) {
    const user = await findUserById(
      options.service.defaultLeadOwnerId.toHexString()
    );
    if (user && canReceiveLeadForWebsite(user, options.website._id)) {
      return options.service.defaultLeadOwnerId;
    }
  }

  if (options.website.defaultLeadOwnerId) {
    const user = await findUserById(
      options.website.defaultLeadOwnerId.toHexString()
    );
    if (user && canReceiveLeadForWebsite(user, options.website._id)) {
      return options.website.defaultLeadOwnerId;
    }
  }

  return undefined;
}

async function logIntegrationEvent(
  data: Omit<IntegrationLog, "_id">
): Promise<void> {
  try {
    await createIntegrationLog(data);
  } catch (error) {
    console.error("[integration-log]", error);
  }
}

function mapIntegrationType(
  value: unknown
): IntegrationLog["integrationType"] {
  if (
    value === "website" ||
    value === "n8n" ||
    value === "apps_script" ||
    value === "import" ||
    value === "other"
  ) {
    return value;
  }
  if (value === "manual") {
    return "other";
  }
  return "website";
}

function mapSourceSystem(value: unknown): SourceSystem {
  if (
    value === "website" ||
    value === "n8n" ||
    value === "apps_script" ||
    value === "manual" ||
    value === "import"
  ) {
    return value;
  }
  return "website";
}

export async function ingestWebhookLead(
  options: IngestWebhookLeadOptions
): Promise<WebhookResult> {
  const startedAt = Date.now();
  const requestMethod = options.requestMethod ?? "POST";
  let website: Website | null = null;
  let resolvedForm: WebsiteForm | null = null;
  let logStatus: IntegrationLogStatus = "received";
  let logLeadId: ObjectId | undefined;
  let logErrorCode: string | undefined;
  let logErrorMessage: string | undefined;
  let validationErrors:
    | Array<{ field: string; message: string }>
    | undefined;
  let receivedFieldNames: string[] | undefined;
  let mappedFieldNames: string[] | undefined;
  let ignoredFieldNames: string[] | undefined;
  let unknownFieldNames: string[] | undefined;
  const isTestLead =
    coerceBoolean(options.rawPayload.isTestLead) ??
  false;

  try {
    website = await findWebsiteByWebhookKey(options.websiteKey);

    if (!website) {
      throw new ApiError(404, "WEBSITE_NOT_FOUND", "Unknown website key.");
    }

    if (!website.isActive) {
      throw new ApiError(
        403,
        "WEBSITE_INACTIVE",
        "This website is inactive and cannot accept new leads."
      );
    }

    const env = getServerEnv();
    const minuteLimit = await consumeRateLimit({
      scope: "webhook:minute",
      identifier: website._id.toHexString(),
      maxRequests: env.WEBHOOK_RATE_LIMIT_PER_MINUTE ?? 60,
      windowMs: 60_000,
      blockDurationMs: 60_000,
    });
    if (!minuteLimit.allowed) {
      throw new ApiError(
        429,
        "RATE_LIMITED",
        "Too many webhook requests. Please retry later."
      );
    }

    const hourLimit = await consumeRateLimit({
      scope: "webhook:hour",
      identifier: website._id.toHexString(),
      maxRequests: env.WEBHOOK_RATE_LIMIT_PER_HOUR ?? 300,
      windowMs: 60 * 60 * 1000,
      blockDurationMs: 15 * 60_000,
    });
    if (!hourLimit.allowed) {
      throw new ApiError(
        429,
        "RATE_LIMITED",
        "Hourly webhook limit exceeded. Please retry later."
      );
    }

    if (!options.apiKey || !verifyApiKey(options.apiKey, website.apiKeyHash)) {
      throw new ApiError(401, "INVALID_API_KEY", "Invalid API key.");
    }

    receivedFieldNames = collectPayloadFieldNames(options.rawPayload);

    resolvedForm = await resolveForm({
      websiteId: website._id.toHexString(),
      routeFormCode: options.formCode,
      headerFormCode: options.headerFormCode,
      payload: options.rawPayload,
    });

    if (!resolvedForm) {
      throw new ApiError(
        404,
        "FORM_NOT_FOUND",
        "No matching form was found for this submission."
      );
    }

    if (!resolvedForm.isActive) {
      throw new ApiError(
        403,
        "FORM_INACTIVE",
        "This form is inactive and cannot accept new leads."
      );
    }

    if (options.idempotencyKey) {
      const existing = await findIdempotencyRecord(
        website._id.toHexString(),
        options.idempotencyKey
      );
      if (existing) {
        logStatus = "idempotent_replay";
        logLeadId = existing.leadId;
        return {
          leadId: existing.leadId.toHexString(),
          contactId: existing.contactId.toHexString(),
          leadNumber: existing.leadNumber,
          idempotentReplay: true,
        };
      }
    }

    const externalSubmissionId = normalizeOptionalString(
      (options.rawPayload.externalSubmissionId as string | undefined) ??
        options.idempotencyKey ??
        undefined
    );

    if (externalSubmissionId) {
      const duplicate = await findLeadByExternalSubmission(
        website._id.toHexString(),
        externalSubmissionId
      );
      if (duplicate) {
        logStatus = "idempotent_replay";
        logLeadId = duplicate._id;
        return {
          leadId: duplicate._id.toHexString(),
          contactId: duplicate.contactId.toHexString(),
          leadNumber: duplicate.leadNumber,
          idempotentReplay: true,
        };
      }
    }

    const sourceSystem = mapSourceSystem(options.rawPayload.sourceSystem);
    const explicitAssignedUserId = normalizeOptionalString(
      options.rawPayload.assignedUserId as string | undefined
    );

    const now = new Date();
    const leadNumber = await generateLeadNumber(now.getFullYear());

    if (resolvedForm.schemaMode === "legacy") {
      const payload = webhookLeadSchema.parse(options.rawPayload);
      const service = await resolveCrmService({
        websiteId: website._id.toHexString(),
        serviceId: normalizeOptionalString(
          options.rawPayload.serviceId as string | undefined
        ),
        serviceCode: normalizeOptionalString(
          options.rawPayload.serviceCode as string | undefined
        ),
        submittedServiceName: normalizeOptionalString(payload.service),
      });
      const assignedUserId = await resolveAssignedUserId({
        explicitAssignedUserId,
        form: resolvedForm,
        service,
        website,
      });

      const { contact } = await findOrCreateContact({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        whatsapp: payload.whatsapp,
        company: payload.company,
        country: payload.country,
        state: payload.state,
        city: payload.city,
      });

      const legacyMapped = tryMapLegacyFormSubmission(
        resolvedForm,
        options.rawPayload
      );
      const mergedAttribution = mergeAttributionSources(
        extractAttributionFromRawPayload(options.rawPayload),
        payload.attribution,
        legacyMapped?.attributionData
      );

      const lead = await createLead({
        leadNumber,
        contactId: contact._id,
        websiteId: website._id,
        formId: resolvedForm._id,
        formCode: resolvedForm.code,
        formName: normalizeOptionalString(payload.formName) ?? resolvedForm.name,
        formSchemaVersion: resolvedForm.schemaVersion,
        formFieldValues: legacyMapped?.formFieldValues,
        isTestLead,
        externalSubmissionId,
        sourceSystem: (payload.sourceSystem ?? sourceSystem) as SourceSystem,
        serviceId: service?._id,
        service: normalizeOptionalString(payload.service) ?? service?.name,
        submittedServiceName: normalizeOptionalString(payload.service),
        message: normalizeOptionalString(payload.message),
        assignedUserId,
        status: assignedUserId ? "assigned" : "new",
        priority: "normal",
        currency:
          payload.currency?.toUpperCase() ??
          service?.defaultCurrency ??
          website.defaultCurrency,
        consentStatus: payload.consentStatus as ConsentStatus | undefined,
        privacyPolicyVersion: normalizeOptionalString(
          payload.privacyPolicyVersion
        ),
        createdAt: now,
        updatedAt: now,
      });

      if (hasAttributionData(mergedAttribution)) {
        await createLeadAttributionRecord({
          leadId: lead._id,
          contactId: contact._id,
          websiteId: website._id,
          attribution: mergedAttribution!,
          capturedAt: now,
        });
      }

      await createActivity({
        leadId: lead._id,
        contactId: contact._id,
        websiteId: website._id,
        type: "lead_created",
        description: `Lead created via ${lead.sourceSystem} webhook.`,
        createdBySystem: lead.sourceSystem,
        metadata: {
          formCode: lead.formCode,
          formName: lead.formName,
          service: lead.service,
          isTestLead,
        },
        createdAt: now,
      });

      await notifyNewLead({
        leadId: lead._id,
        websiteId: website._id,
        leadNumber: lead.leadNumber,
        websiteName: website.name,
        formName: lead.formName,
        contactName: contact.name,
        sourceSystem: lead.sourceSystem,
        assignedUserId: lead.assignedUserId,
      });

      if (options.idempotencyKey) {
        try {
          await createIdempotencyRecord({
            websiteId: website._id,
            idempotencyKey: options.idempotencyKey,
            leadId: lead._id,
            contactId: contact._id,
            leadNumber: lead.leadNumber,
            createdAt: now,
          });
        } catch {
          const raced = await findIdempotencyRecord(
            website._id.toHexString(),
            options.idempotencyKey
          );
          if (raced) {
            logStatus = "idempotent_replay";
            logLeadId = raced.leadId;
            return {
              leadId: raced.leadId.toHexString(),
              contactId: raced.contactId.toHexString(),
              leadNumber: raced.leadNumber,
              idempotentReplay: true,
            };
          }
        }
      }

      logStatus = "successful";
      logLeadId = lead._id;
      mappedFieldNames = receivedFieldNames;

      return {
        leadId: lead._id.toHexString(),
        contactId: contact._id.toHexString(),
        leadNumber: lead.leadNumber,
        idempotentReplay: false,
      };
    }

    const mapped = mapFormSubmission(
      stripMetadataForMapping(options.rawPayload),
      resolvedForm
    );
    mappedFieldNames = [
      ...Object.keys(mapped.contactData),
      ...Object.keys(mapped.leadData),
      ...Object.keys(mapped.attributionData),
      ...mapped.customFieldValues.map((field) => field.incomingKey),
    ];
    ignoredFieldNames = mapped.ignoredFieldNames;
    unknownFieldNames = mapped.unknownFieldNames;

    const contactName =
      mapped.contactData.name ??
      [mapped.contactData.firstName, mapped.contactData.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

    if (!contactName) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "A contact name is required for this form."
      );
    }

    const service = await resolveCrmService({
      websiteId: website._id.toHexString(),
      serviceId: normalizeOptionalString(
        options.rawPayload.serviceId as string | undefined
      ),
      serviceCode: normalizeOptionalString(
        options.rawPayload.serviceCode as string | undefined
      ),
      submittedServiceName: mapped.leadData.service,
    });
    const assignedUserId = await resolveAssignedUserId({
      explicitAssignedUserId,
      form: resolvedForm,
      service,
      website,
    });

    const { contact } = await findOrCreateContact({
      name: contactName,
      email: mapped.contactData.email,
      phone: mapped.contactData.phone,
      whatsapp: mapped.contactData.whatsapp,
      company: mapped.contactData.company,
      country: mapped.contactData.country,
      state: mapped.contactData.state,
      city: mapped.contactData.city,
    });

    const lead = await createLead({
      leadNumber,
      contactId: contact._id,
      websiteId: website._id,
      formId: resolvedForm._id,
      formCode: resolvedForm.code,
      formName: resolvedForm.name,
      formSchemaVersion: mapped.schemaVersion,
      formFieldValues: mapped.customFieldValues,
      isTestLead,
      externalSubmissionId,
      sourceSystem,
      serviceId: service?._id ?? resolvedForm.defaultServiceId,
      service: mapped.leadData.service ?? service?.name,
      submittedServiceName: mapped.leadData.service,
      message: mapped.leadData.message,
      assignedUserId,
      status: assignedUserId ? "assigned" : "new",
      priority: (mapped.leadData.priority ?? "normal") as LeadPriority,
      currency:
        mapped.leadData.currency?.toUpperCase() ??
        service?.defaultCurrency ??
        website.defaultCurrency,
      consentStatus: normalizeOptionalString(
        options.rawPayload.consentStatus as string | undefined
      ) as ConsentStatus | undefined,
      privacyPolicyVersion: normalizeOptionalString(
        options.rawPayload.privacyPolicyVersion as string | undefined
      ),
      createdAt: now,
      updatedAt: now,
    });

    const mergedAttribution = mergeAttributionSources(
      extractAttributionFromRawPayload(options.rawPayload),
      mapped.attributionData
    );

    if (resolvedForm.attributionEnabled && hasAttributionData(mergedAttribution)) {
      await createLeadAttributionRecord({
        leadId: lead._id,
        contactId: contact._id,
        websiteId: website._id,
        attribution: mergedAttribution!,
        capturedAt: mapped.attributionData.submittedAt ?? now,
      });
    }

    await createActivity({
      leadId: lead._id,
      contactId: contact._id,
      websiteId: website._id,
      type: "lead_created",
      description: `Lead created via ${lead.sourceSystem} webhook.`,
      createdBySystem: lead.sourceSystem,
      metadata: {
        formCode: lead.formCode,
        formName: lead.formName,
        service: lead.service,
        isTestLead,
        schemaVersion: lead.formSchemaVersion,
      },
      createdAt: now,
    });

    await notifyNewLead({
      leadId: lead._id,
      websiteId: website._id,
      leadNumber: lead.leadNumber,
      websiteName: website.name,
      formName: lead.formName,
      contactName: contact.name,
      sourceSystem: lead.sourceSystem,
      assignedUserId: lead.assignedUserId,
    });

    if (options.idempotencyKey) {
      try {
        await createIdempotencyRecord({
          websiteId: website._id,
          idempotencyKey: options.idempotencyKey,
          leadId: lead._id,
          contactId: contact._id,
          leadNumber: lead.leadNumber,
          createdAt: now,
        });
      } catch {
        const raced = await findIdempotencyRecord(
          website._id.toHexString(),
          options.idempotencyKey
        );
        if (raced) {
          logStatus = "idempotent_replay";
          logLeadId = raced.leadId;
          return {
            leadId: raced.leadId.toHexString(),
            contactId: raced.contactId.toHexString(),
            leadNumber: raced.leadNumber,
            idempotentReplay: true,
          };
        }
      }
    }

    logStatus = "successful";
    logLeadId = lead._id;

    return {
      leadId: lead._id.toHexString(),
      contactId: contact._id.toHexString(),
      leadNumber: lead.leadNumber,
      idempotentReplay: false,
    };
  } catch (error) {
    if (error instanceof FormSubmissionMappingError) {
      logStatus = "rejected";
      logErrorCode = "VALIDATION_ERROR";
      logErrorMessage = error.message;
      validationErrors = error.errors;
      unknownFieldNames = error.unknownFieldNames;
      throw new ApiError(400, "VALIDATION_ERROR", error.message);
    }

    if (error instanceof ApiError) {
      logStatus = error.status >= 500 ? "failed" : "rejected";
      logErrorCode = error.code;
      logErrorMessage = error.message;
      throw error;
    }

    logStatus = "failed";
    logErrorCode = "INTERNAL_ERROR";
    logErrorMessage =
      error instanceof Error ? error.message : "Webhook ingestion failed.";
    throw error;
  } finally {
    if (website) {
      await logIntegrationEvent({
        websiteId: website._id,
        formId: resolvedForm?._id,
        formCode: resolvedForm?.code,
        formSchemaVersion: resolvedForm?.schemaVersion,
        integrationType: mapIntegrationType(options.rawPayload.sourceSystem),
        endpoint: options.endpoint,
        requestMethod,
        idempotencyKey: options.idempotencyKey ?? undefined,
        externalSubmissionId: normalizeOptionalString(
          options.rawPayload.externalSubmissionId as string | undefined
        ),
        status: logStatus,
        leadId: logLeadId,
        receivedFieldNames,
        mappedFieldNames,
        ignoredFieldNames,
        unknownFieldNames,
        validationErrors,
        testSubmission: isTestLead,
        errorCode: logErrorCode,
        safeErrorMessage: logErrorMessage,
        processingDurationMs: Date.now() - startedAt,
        createdAt: new Date(),
      });
    }
  }
}

export async function testWebsiteWebhookAccess(websiteId: string): Promise<{
  websiteName: string;
  webhookKey: string;
  isActive: boolean;
}> {
  const { findWebsiteById } = await import("@/repositories/websites.repository");
  const website = await findWebsiteById(websiteId);
  if (!website) {
    throw new ApiError(404, "WEBSITE_NOT_FOUND", "Website not found.");
  }

  return {
    websiteName: website.name,
    webhookKey: website.webhookKey,
    isActive: website.isActive,
  };
}
