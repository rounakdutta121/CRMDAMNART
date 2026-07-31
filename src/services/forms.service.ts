import { ObjectId } from "mongodb";
import { writeAuditLog } from "@/lib/audit";
import { generateLeadNumber } from "@/lib/lead-number";
import { normalizeOptionalString } from "@/lib/normalization";
import {
  incrementSchemaVersion,
  validateFormSchema,
} from "@/lib/form-schema";
import { getFormTemplate, isFormTemplateId } from "@/lib/form-templates";
import { normalizeWebsiteCode } from "@/lib/normalization";
import {
  SampleJsonSchemaError,
  parseSampleJsonString,
} from "@/lib/sample-json-schema";
import {
  assertCanAccessWebsite,
  canManageForms,
  PermissionError,
} from "@/lib/permissions";
import type {
  CreateFormInput,
  TestFormSubmissionInput,
  UpdateFormInput,
} from "@/lib/validation/form.schema";
import {
  createForm,
  deleteForm,
  findFormByCode,
  findFormById,
  listFormsByWebsite,
  updateForm,
} from "@/repositories/forms.repository";
import { createActivity } from "@/repositories/activities.repository";
import { createAttribution } from "@/repositories/attributions.repository";
import { createLead } from "@/repositories/leads.repository";
import { findServiceById } from "@/repositories/services.repository";
import { findWebsiteById } from "@/repositories/websites.repository";
import { findOrCreateContact } from "@/services/contacts.service";
import {
  FormSubmissionMappingError,
  mapFormSubmission,
} from "@/services/form-submission-mapper.service";
import type { SessionUser } from "@/types/auth";
import type { WebsiteForm } from "@/types/form";

export async function getFormsForWebsite(
  user: SessionUser,
  websiteId: string,
  options?: { isActive?: boolean }
): Promise<WebsiteForm[]> {
  assertCanAccessWebsite(user, websiteId);
  return listFormsByWebsite(websiteId, options);
}

export async function getFormForUser(
  user: SessionUser,
  formId: string
): Promise<WebsiteForm> {
  const form = await findFormById(formId);
  if (!form) {
    throw new Error("Form not found.");
  }

  assertCanAccessWebsite(user, form.websiteId.toHexString());
  return form;
}

export async function createFormForUser(
  user: SessionUser,
  input: CreateFormInput
): Promise<WebsiteForm> {
  if (!canManageForms(user.role)) {
    throw new PermissionError("You are not allowed to create forms.");
  }

  assertCanAccessWebsite(user, input.websiteId);

  const code = normalizeWebsiteCode(input.code);
  const existing = await findFormByCode(input.websiteId, code);
  if (existing) {
    throw new Error("A form with this code already exists on this website.");
  }

  const templateId = isFormTemplateId(input.templateId)
    ? input.templateId
    : "basic_contact";
  const fields = getFormTemplate(templateId);
  const issues = validateFormSchema(fields);
  if (issues.length > 0) {
    throw new Error(issues[0]?.message ?? "Invalid form schema.");
  }

  const now = new Date();
  const form = await createForm({
    websiteId: new ObjectId(input.websiteId),
    name: input.name.trim(),
    code,
    description: input.description?.trim(),
    pageUrl: input.pageUrl?.trim(),
    defaultServiceId: input.defaultServiceId
      ? new ObjectId(input.defaultServiceId)
      : undefined,
    defaultLeadOwnerId: input.defaultLeadOwnerId
      ? new ObjectId(input.defaultLeadOwnerId)
      : undefined,
    fields,
    schemaVersion: 1,
    schemaMode: "dynamic",
    unknownFieldPolicy: input.unknownFieldPolicy,
    contactIdentityRule: input.contactIdentityRule,
    attributionEnabled: input.attributionEnabled,
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    actingUserId: user.id,
    action: "form.created",
    entityType: "integration",
    entityId: form._id,
    websiteId: input.websiteId,
    newValues: {
      name: form.name,
      code: form.code,
      templateId,
    },
  });

  return form;
}

export async function updateFormForUser(
  user: SessionUser,
  formId: string,
  input: UpdateFormInput
): Promise<WebsiteForm> {
  if (!canManageForms(user.role)) {
    throw new PermissionError("You are not allowed to update forms.");
  }

  const existing = await findFormById(formId);
  if (!existing) {
    throw new Error("Form not found.");
  }

  assertCanAccessWebsite(user, existing.websiteId.toHexString());

  const update: Parameters<typeof updateForm>[1] = {};
  let schemaChanged = false;

  if (input.name !== undefined) update.name = input.name.trim();
  if (input.description !== undefined) {
    update.description = input.description.trim();
  }
  if (input.pageUrl !== undefined) update.pageUrl = input.pageUrl.trim();
  if (input.defaultServiceId !== undefined) {
    update.defaultServiceId = input.defaultServiceId
      ? new ObjectId(input.defaultServiceId)
      : undefined;
  }
  if (input.defaultLeadOwnerId !== undefined) {
    update.defaultLeadOwnerId = input.defaultLeadOwnerId
      ? new ObjectId(input.defaultLeadOwnerId)
      : undefined;
  }
  if (input.unknownFieldPolicy !== undefined) {
    update.unknownFieldPolicy = input.unknownFieldPolicy;
  }
  if (input.contactIdentityRule !== undefined) {
    update.contactIdentityRule = input.contactIdentityRule;
  }
  if (input.attributionEnabled !== undefined) {
    update.attributionEnabled = input.attributionEnabled;
  }
  if (input.isActive !== undefined) update.isActive = input.isActive;

  if (input.fields !== undefined) {
    const issues = validateFormSchema(input.fields);
    if (issues.length > 0) {
      throw new Error(issues[0]?.message ?? "Invalid form schema.");
    }
    update.fields = input.fields;
    schemaChanged = true;
    update.schemaVersion = incrementSchemaVersion(existing);
  }

  await updateForm(formId, update);

  await writeAuditLog({
    actingUserId: user.id,
    action: schemaChanged
      ? "form.schema_updated"
      : input.isActive === false
        ? "form.deactivated"
        : "form.updated",
    entityType: "integration",
    entityId: formId,
    websiteId: existing.websiteId.toHexString(),
    previousValues: {
      name: existing.name,
      schemaVersion: existing.schemaVersion,
      isActive: existing.isActive,
    },
    newValues: update as Record<string, unknown>,
  });

  const updated = await findFormById(formId);
  if (!updated) {
    throw new Error("Form not found after update.");
  }
  return updated;
}

export async function activateDynamicSchemaForForm(
  user: SessionUser,
  formId: string
): Promise<WebsiteForm> {
  if (!canManageForms(user.role)) {
    throw new PermissionError("You are not allowed to update forms.");
  }

  const existing = await findFormById(formId);
  if (!existing) {
    throw new Error("Form not found.");
  }

  assertCanAccessWebsite(user, existing.websiteId.toHexString());

  await updateForm(formId, { schemaMode: "dynamic" });

  await writeAuditLog({
    actingUserId: user.id,
    action: "form.dynamic_schema_activated",
    entityType: "integration",
    entityId: formId,
    websiteId: existing.websiteId.toHexString(),
    previousValues: { schemaMode: existing.schemaMode },
    newValues: { schemaMode: "dynamic" },
  });

  const updated = await findFormById(formId);
  if (!updated) {
    throw new Error("Form not found after activation.");
  }
  return updated;
}

export async function generateFormFromTemplateForUser(
  user: SessionUser,
  formId: string,
  templateId: string
): Promise<WebsiteForm> {
  if (!isFormTemplateId(templateId)) {
    throw new Error("Unknown form template.");
  }

  const fields = getFormTemplate(templateId);
  return updateFormForUser(user, formId, {
    fields,
  } as UpdateFormInput);
}

export async function generateFormFromSampleJsonForUser(
  user: SessionUser,
  formId: string,
  sampleJson: string
): Promise<WebsiteForm> {
  try {
    const fields = parseSampleJsonString(sampleJson);
    return updateFormForUser(user, formId, {
      fields,
    } as UpdateFormInput);
  } catch (error) {
    if (error instanceof SampleJsonSchemaError) {
      throw new Error(error.message);
    }
    throw error;
  }
}

export async function deactivateFormForUser(
  user: SessionUser,
  formId: string
): Promise<void> {
  if (!canManageForms(user.role)) {
    throw new PermissionError("You are not allowed to delete forms.");
  }

  const existing = await findFormById(formId);
  if (!existing) {
    throw new Error("Form not found.");
  }

  assertCanAccessWebsite(user, existing.websiteId.toHexString());
  await deleteForm(formId);

  await writeAuditLog({
    actingUserId: user.id,
    action: "form.deleted",
    entityType: "integration",
    entityId: formId,
    websiteId: existing.websiteId.toHexString(),
    previousValues: {
      name: existing.name,
      code: existing.code,
      isActive: existing.isActive,
    },
  });
}

export async function testFormSubmissionForUser(
  user: SessionUser,
  formId: string,
  input: TestFormSubmissionInput
) {
  const form = await getFormForUser(user, formId);

  try {
    const mapped = mapFormSubmission(input.payload, form);

    if (input.validateOnly) {
      return {
        valid: true,
        message: "Submission is valid.",
        mapped,
        unknownFieldNames: mapped.unknownFieldNames,
      };
    }

    const website = await findWebsiteById(form.websiteId.toHexString());
    if (!website) {
      throw new Error("Website not found.");
    }

    const contactName =
      mapped.contactData.name ??
      [mapped.contactData.firstName, mapped.contactData.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

    if (!contactName) {
      return {
        valid: false,
        message: "Contact name is required.",
        errors: [{ field: "name", message: "Contact name is required." }],
      };
    }

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

    let serviceName = mapped.leadData.service;
    let serviceId: ObjectId | undefined;

    if (form.defaultServiceId) {
      const service = await findServiceById(form.defaultServiceId.toHexString());
      if (service) {
        serviceId = service._id;
        serviceName = serviceName ?? service.name;
      }
    }

    const now = new Date();
    const leadNumber = await generateLeadNumber(now.getFullYear());
    const assignedUserId =
      form.defaultLeadOwnerId ?? website.defaultLeadOwnerId ?? undefined;

    const lead = await createLead({
      leadNumber,
      contactId: contact._id,
      websiteId: website._id,
      formId: form._id,
      formCode: form.code,
      formName: form.name,
      formSchemaVersion: mapped.schemaVersion,
      formFieldValues: mapped.customFieldValues,
      isTestLead: true,
      sourceSystem: "manual",
      serviceId,
      service: serviceName,
      message: mapped.leadData.message,
      assignedUserId,
      status: assignedUserId ? "assigned" : "new",
      priority: mapped.leadData.priority ?? "normal",
      currency:
        mapped.leadData.currency?.toUpperCase() ?? website.defaultCurrency,
      createdAt: now,
      updatedAt: now,
    });

    const hasAttribution = Object.values(mapped.attributionData).some(
      (value) => typeof value === "string" && value.trim().length > 0
    );

    if (hasAttribution && form.attributionEnabled) {
      await createAttribution({
        leadId: lead._id,
        contactId: contact._id,
        websiteId: website._id,
        sessionId: normalizeOptionalString(mapped.attributionData.sessionId),
        gclid: normalizeOptionalString(mapped.attributionData.gclid),
        gbraid: normalizeOptionalString(mapped.attributionData.gbraid),
        wbraid: normalizeOptionalString(mapped.attributionData.wbraid),
        msclkid: normalizeOptionalString(mapped.attributionData.msclkid),
        fbclid: normalizeOptionalString(mapped.attributionData.fbclid),
        utmSource: normalizeOptionalString(mapped.attributionData.utmSource),
        utmMedium: normalizeOptionalString(mapped.attributionData.utmMedium),
        utmCampaign: normalizeOptionalString(mapped.attributionData.utmCampaign),
        utmTerm: normalizeOptionalString(mapped.attributionData.utmTerm),
        utmContent: normalizeOptionalString(mapped.attributionData.utmContent),
        landingPage: normalizeOptionalString(mapped.attributionData.landingPage),
        formPage: normalizeOptionalString(mapped.attributionData.formPage),
        pageUrl: normalizeOptionalString(mapped.attributionData.pageUrl),
        referrer: normalizeOptionalString(mapped.attributionData.referrer),
        touchType: "submission",
        capturedAt: mapped.attributionData.submittedAt ?? now,
      });
    }

    await createActivity({
      leadId: lead._id,
      contactId: contact._id,
      websiteId: website._id,
      type: "lead_created",
      description: `Test lead created from form "${form.name}".`,
      createdByUserId: new ObjectId(user.id),
      metadata: {
        formCode: form.code,
        isTestLead: true,
      },
      createdAt: now,
    });

    await writeAuditLog({
      actingUserId: user.id,
      action: "form.test_lead_created",
      entityType: "lead",
      entityId: lead._id,
      websiteId: form.websiteId.toHexString(),
      newValues: {
        leadNumber: lead.leadNumber,
        formCode: form.code,
        isTestLead: true,
      },
    });

    return {
      valid: true,
      message: "Test lead created.",
      leadId: lead._id.toHexString(),
      leadNumber: lead.leadNumber,
      mapped,
      unknownFieldNames: mapped.unknownFieldNames,
    };
  } catch (error) {
    if (error instanceof FormSubmissionMappingError) {
      return {
        valid: false,
        message: error.message,
        errors: error.errors,
        unknownFieldNames: error.unknownFieldNames,
      };
    }
    throw error;
  }
}

export function buildSampleFormPayload(
  form: WebsiteForm
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    formCode: form.code,
    formName: form.name,
    sourceSystem: "website",
  };

  for (const field of form.fields.filter((item) => item.active)) {
    switch (field.fieldType) {
      case "email":
        payload[field.incomingKey] = "person@example.com";
        break;
      case "phone":
        payload[field.incomingKey] = "+919876543210";
        break;
      case "textarea":
        payload[field.incomingKey] = "Example message for testing.";
        break;
      case "number":
        payload[field.incomingKey] = 1000;
        break;
      case "boolean":
      case "checkbox":
        payload[field.incomingKey] = true;
        break;
      case "select":
        payload[field.incomingKey] =
          field.options?.[0]?.value ?? "option_value";
        break;
      case "multi_select":
        payload[field.incomingKey] = field.options?.[0]?.value
          ? [field.options[0].value]
          : ["option_value"];
        break;
      default:
        payload[field.incomingKey] = `Example ${field.label}`;
        break;
    }
  }

  if (form.attributionEnabled) {
    payload.attribution = {
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "example-campaign",
      landingPage: form.pageUrl ?? "https://example.com/landing",
      formPage: form.pageUrl ?? "https://example.com/contact",
    };
  }

  return payload;
}
