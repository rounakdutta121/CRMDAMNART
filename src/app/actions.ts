"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { requireSession, signIn, signOut } from "@/lib/auth";
import { createWebsiteSchema, updateWebsiteSchema } from "@/lib/validation/website.schema";
import {
  addNoteSchema,
  contactAttemptSchema,
  createManualLeadFromFormSchema,
  createManualLeadSchema,
  scheduleFollowUpSchema,
  updateContactSchema,
  updateLeadSchema,
} from "@/lib/validation/lead.schema";
import { loginSchema } from "@/lib/validation/auth.schema";
import {
  createFormSchema,
  testFormSubmissionSchema,
  updateFormSchema,
} from "@/lib/validation/form.schema";
import { normalizeFormFieldDefinitions } from "@/lib/form-schema";
import {
  createServiceSchema,
  updateServiceSchema,
} from "@/lib/validation/service.schema";
import {
  createUserSchema,
  resetPasswordSchema,
  updateUserSchema,
} from "@/lib/validation/user.schema";
import {
  createWebsiteForUser,
  deleteWebsiteForUser,
  regenerateApiKeyForUser,
  updateWebsiteForUser,
} from "@/services/websites.service";
import {
  addNoteToLead,
  createManualLead,
  createManualLeadFromForm,
  deleteLeadForUser,
  logContactAttempt,
  scheduleFollowUpForLead,
  updateLeadForUser,
} from "@/services/leads.service";
import { updateContactForUser } from "@/services/contacts.service";
import { completeFollowUp } from "@/services/follow-ups.service";
import {
  bulkUpdateLeadsForUser,
} from "@/services/leads.service";
import {
  deleteLeadViewForUser,
  saveLeadViewForUser,
} from "@/services/saved-views.service";
import { importLeadsFromMappedRows } from "@/services/import-leads.service";
import { mergeContactsForUser } from "@/services/contacts.service";
import {
  createFormForUser,
  deactivateFormForUser,
  testFormSubmissionForUser,
  updateFormForUser,
} from "@/services/forms.service";
import {
  createServiceForUser,
  updateServiceForUser,
} from "@/services/services.service";
import {
  createUserForAdmin,
  deactivateUserForAdmin,
  resetPasswordForAdmin,
  updateUserForAdmin,
} from "@/services/users.service";
import { bulkLeadActionSchema } from "@/lib/validation/bulk.schema";
import { saveLeadViewSchema } from "@/lib/validation/saved-view.schema";
import {
  importColumnMappingSchema,
  mergeContactsSchema,
} from "@/lib/validation/import.schema";
import {
  canImportLeads,
  canPerformBulkActions,
  PermissionError,
} from "@/lib/permissions";

export type ActionResult =
  | { success: true; message?: string; data?: Record<string, unknown> }
  | { success: false; message: string };

function toActionError(error: unknown): ActionResult {
  if (error instanceof PermissionError) {
    return { success: false, message: error.message };
  }
  if (error instanceof Error) {
    return { success: false, message: error.message };
  }
  return { success: false, message: "Something went wrong." };
}

export async function loginAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid credentials.",
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, message: "Invalid email or password." };
    }
    throw error;
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function createWebsiteAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const additionalDomainsRaw = String(formData.get("additionalDomains") ?? "");
    const parsed = createWebsiteSchema.safeParse({
      name: formData.get("name"),
      code: formData.get("code"),
      primaryDomain: formData.get("primaryDomain"),
      additionalDomains: additionalDomainsRaw
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean),
      brandName: formData.get("brandName") || undefined,
      businessDivision: formData.get("businessDivision") || undefined,
      defaultCurrency: formData.get("defaultCurrency") || "INR",
      timezone: formData.get("timezone") || "Asia/Kolkata",
      isActive: formData.get("isActive") !== "false",
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }

    const result = await createWebsiteForUser(user, parsed.data);
    revalidatePath("/websites");
    redirect(
      `/websites/${result.website._id.toHexString()}?apiKey=${encodeURIComponent(result.apiKey)}`
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return toActionError(error);
  }
}

export async function updateWebsiteAction(
  websiteId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const additionalDomainsRaw = String(formData.get("additionalDomains") ?? "");
    const parsed = updateWebsiteSchema.safeParse({
      name: formData.get("name"),
      code: formData.get("code"),
      primaryDomain: formData.get("primaryDomain"),
      additionalDomains: additionalDomainsRaw
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean),
      brandName: formData.get("brandName") || undefined,
      businessDivision: formData.get("businessDivision") || undefined,
      defaultCurrency: formData.get("defaultCurrency") || "INR",
      timezone: formData.get("timezone") || "Asia/Kolkata",
      isActive: formData.get("isActive") === "true",
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }

    await updateWebsiteForUser(user, websiteId, parsed.data);
    revalidatePath("/websites");
    revalidatePath(`/websites/${websiteId}`);
    return { success: true, message: "Website updated." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function regenerateApiKeyAction(
  websiteId: string
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const result = await regenerateApiKeyForUser(user, websiteId);
    revalidatePath(`/websites/${websiteId}`);
    return {
      success: true,
      message: "API key regenerated. Copy it now — it will not be shown again.",
      data: { apiKey: result.apiKey },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteWebsiteAction(
  websiteId: string
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    await deleteWebsiteForUser(user, websiteId);
    revalidatePath("/websites");
    revalidatePath(`/websites/${websiteId}`);
    return { success: true, message: "Website deleted." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteLeadAction(leadId: string): Promise<ActionResult> {
  try {
    const user = await requireSession();
    await deleteLeadForUser(user, leadId);
    revalidatePath("/leads");
    revalidatePath(`/leads/${leadId}`);
    return { success: true, message: "Lead deleted." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createManualLeadAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const formId = String(formData.get("formId") ?? "");

    if (formId) {
      const adminKeys = new Set([
        "websiteId",
        "formId",
        "salesStatus",
        "fulfilmentStatus",
        "priority",
        "assignedUserId",
        "leadValue",
        "currency",
      ]);
      const payload: Record<string, unknown> = {};
      for (const [key, value] of formData.entries()) {
        if (adminKeys.has(key)) {
          continue;
        }
        if (typeof value === "string") {
          payload[key] = value;
        }
      }

      const parsed = createManualLeadFromFormSchema.safeParse({
        websiteId: formData.get("websiteId"),
        formId,
        payload,
        salesStatus: formData.get("salesStatus") || "new",
        fulfilmentStatus: formData.get("fulfilmentStatus") || undefined,
        priority: formData.get("priority") || "normal",
        assignedUserId: formData.get("assignedUserId") || "",
        leadValue: formData.get("leadValue") || undefined,
        currency: formData.get("currency") || undefined,
      });

      if (!parsed.success) {
        return {
          success: false,
          message: parsed.error.issues[0]?.message ?? "Validation failed.",
        };
      }

      const lead = await createManualLeadFromForm(user, parsed.data);
      revalidatePath("/leads");
      revalidatePath("/dashboard");
      redirect(`/leads/${lead._id.toHexString()}`);
    }

    const parsed = createManualLeadSchema.safeParse({
      websiteId: formData.get("websiteId"),
      name: formData.get("name"),
      email: formData.get("email") || "",
      phone: formData.get("phone") || "",
      whatsapp: formData.get("whatsapp") || "",
      company: formData.get("company") || "",
      jobTitle: formData.get("jobTitle") || "",
      country: formData.get("country") || "",
      state: formData.get("state") || "",
      city: formData.get("city") || "",
      service: formData.get("service"),
      serviceCategory: formData.get("serviceCategory") || "",
      formName: formData.get("formName") || "",
      message: formData.get("message") || "",
      salesStatus: formData.get("salesStatus") || "new",
      priority: formData.get("priority") || "normal",
      leadValue: formData.get("leadValue") || undefined,
      currency: formData.get("currency") || "INR",
      assignedUserId: formData.get("assignedUserId") || "",
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }

    const lead = await createManualLead(user, parsed.data);
    revalidatePath("/leads");
    revalidatePath("/dashboard");
    redirect(`/leads/${lead._id.toHexString()}`);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return toActionError(error);
  }
}

export async function updateLeadAction(
  leadId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const assignedRaw = formData.get("assignedUserId");
    const parsed = updateLeadSchema.safeParse({
      service: formData.get("service") || undefined,
      serviceCategory: formData.get("serviceCategory") || undefined,
      formName: formData.get("formName") || undefined,
      message: formData.get("message") || undefined,
      salesStatus: formData.get("salesStatus") || undefined,
      fulfilmentStatus: formData.get("fulfilmentStatus") || undefined,
      priority: formData.get("priority") || undefined,
      leadValue: formData.get("leadValue") || undefined,
      currency: formData.get("currency") || undefined,
      assignedUserId:
        assignedRaw === null || assignedRaw === ""
          ? null
          : String(assignedRaw),
      nextFollowUpAt: formData.get("nextFollowUpAt") || undefined,
      lostReason: formData.get("lostReason") || undefined,
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }

    await updateLeadForUser(user, leadId, parsed.data);
    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/leads");
    revalidatePath("/dashboard");
    return { success: true, message: "Lead updated." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateContactAction(
  contactId: string,
  leadId: string,
  websiteId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const parsed = updateContactSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email") || "",
      phone: formData.get("phone") || "",
      whatsapp: formData.get("whatsapp") || "",
      company: formData.get("company") || "",
      jobTitle: formData.get("jobTitle") || "",
      country: formData.get("country") || "",
      state: formData.get("state") || "",
      city: formData.get("city") || "",
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }

    await updateContactForUser(user, contactId, parsed.data, websiteId);
    revalidatePath(`/leads/${leadId}`);
    revalidatePath(`/contacts/${contactId}`);
    return { success: true, message: "Contact updated." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addNoteAction(
  leadId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const parsed = addNoteSchema.safeParse({
      note: formData.get("note"),
    });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }
    await addNoteToLead(user, leadId, parsed.data);
    revalidatePath(`/leads/${leadId}`);
    return { success: true, message: "Note added." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function contactAttemptAction(
  leadId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const parsed = contactAttemptSchema.safeParse({
      note: formData.get("note") || "",
      method: formData.get("method") || "call",
    });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }
    await logContactAttempt(user, leadId, parsed.data);
    revalidatePath(`/leads/${leadId}`);
    return { success: true, message: "Contact attempt logged." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function scheduleFollowUpAction(
  leadId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const parsed = scheduleFollowUpSchema.safeParse({
      method: formData.get("method"),
      scheduledAt: formData.get("scheduledAt"),
      note: formData.get("note") || "",
      assignedUserId: formData.get("assignedUserId") || "",
    });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }
    await scheduleFollowUpForLead(user, leadId, parsed.data);
    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/follow-ups");
    revalidatePath("/dashboard");
    return { success: true, message: "Follow-up scheduled." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function completeFollowUpAction(
  followUpId: string
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    await completeFollowUp(user, followUpId);
    revalidatePath("/follow-ups");
    revalidatePath("/dashboard");
    return { success: true, message: "Follow-up completed." };
  } catch (error) {
    return toActionError(error);
  }
}

function parseStringArray(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .map((value) => String(value))
    .filter(Boolean);
}

export async function createUserAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const parsed = createUserSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      role: formData.get("role"),
      permittedWebsiteIds: parseStringArray(formData, "permittedWebsiteIds"),
      isActive: formData.get("isActive") !== "false",
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }

    const created = await createUserForAdmin(user, parsed.data);
    revalidatePath("/settings/users");
    redirect(`/settings/users/${created._id.toHexString()}`);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return toActionError(error);
  }
}

export async function updateUserAction(
  userId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const parsed = updateUserSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      role: formData.get("role"),
      permittedWebsiteIds: parseStringArray(formData, "permittedWebsiteIds"),
      isActive: formData.get("isActive") === "true",
      canReceiveLeadAssignments:
        formData.get("canReceiveLeadAssignments") === "true",
      canViewUnassignedLeads:
        formData.get("canViewUnassignedLeads") === "true",
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }

    await updateUserForAdmin(user, userId, parsed.data);
    revalidatePath("/settings/users");
    revalidatePath(`/settings/users/${userId}`);
    revalidatePath(`/settings/users/${userId}/edit`);
    revalidatePath("/leads");
    return { success: true, message: "User updated." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function resetPasswordAction(
  userId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const parsed = resetPasswordSchema.safeParse({
      password: formData.get("password"),
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }

    await resetPasswordForAdmin(user, userId, parsed.data);
    return { success: true, message: "Password reset." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deactivateUserAction(
  userId: string
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    await deactivateUserForAdmin(user, userId);
    revalidatePath("/settings/users");
    revalidatePath(`/settings/users/${userId}`);
    return { success: true, message: "User deactivated." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createServiceAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const parsed = createServiceSchema.safeParse({
      name: formData.get("name"),
      code: formData.get("code"),
      category: formData.get("category") || undefined,
      description: formData.get("description") || undefined,
      websiteIds: parseStringArray(formData, "websiteIds"),
      defaultLeadValue: formData.get("defaultLeadValue") || undefined,
      defaultCurrency: formData.get("defaultCurrency") || "INR",
      defaultLeadOwnerId: formData.get("defaultLeadOwnerId") || undefined,
      isActive: formData.get("isActive") !== "false",
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }

    const service = await createServiceForUser(user, parsed.data);
    revalidatePath("/settings/services");
    redirect(`/settings/services/${service._id.toHexString()}`);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return toActionError(error);
  }
}

export async function updateServiceAction(
  serviceId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const parsed = updateServiceSchema.safeParse({
      name: formData.get("name"),
      category: formData.get("category") || undefined,
      description: formData.get("description") || undefined,
      websiteIds: parseStringArray(formData, "websiteIds"),
      defaultLeadValue: formData.get("defaultLeadValue") || undefined,
      defaultCurrency: formData.get("defaultCurrency") || undefined,
      defaultLeadOwnerId: formData.get("defaultLeadOwnerId") || undefined,
      isActive: formData.get("isActive") === "true",
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }

    await updateServiceForUser(user, serviceId, parsed.data);
    revalidatePath("/settings/services");
    revalidatePath(`/settings/services/${serviceId}`);
    revalidatePath(`/settings/services/${serviceId}/edit`);
    return { success: true, message: "Service updated." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createFormAction(
  websiteId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const parsed = createFormSchema.safeParse({
      websiteId,
      name: formData.get("name"),
      code: formData.get("code"),
      description: formData.get("description") || undefined,
      pageUrl: formData.get("pageUrl") || undefined,
      templateId: formData.get("templateId") || "basic_contact",
      defaultServiceId: formData.get("defaultServiceId") || undefined,
      defaultLeadOwnerId: formData.get("defaultLeadOwnerId") || undefined,
      unknownFieldPolicy: formData.get("unknownFieldPolicy") || "ignore",
      contactIdentityRule: formData.get("contactIdentityRule") || "email_or_phone",
      attributionEnabled: formData.get("attributionEnabled") !== "false",
      isActive: formData.get("isActive") !== "false",
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }

    const form = await createFormForUser(user, parsed.data);
    revalidatePath(`/websites/${websiteId}`);
    revalidatePath(`/websites/${websiteId}/forms`);
    redirect(`/websites/${websiteId}/forms/${form._id.toHexString()}`);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return toActionError(error);
  }
}

export async function updateFormAction(
  websiteId: string,
  formId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const fieldsRaw = String(formData.get("fields") ?? "");
    let fields;
    if (fieldsRaw) {
      try {
        const parsedFields = JSON.parse(fieldsRaw);
        fields = Array.isArray(parsedFields)
          ? normalizeFormFieldDefinitions(parsedFields)
          : parsedFields;
      } catch {
        return { success: false, message: "Invalid field configuration." };
      }
    }

    const parsed = updateFormSchema.safeParse({
      name: formData.get("name") || undefined,
      description: formData.get("description") || undefined,
      pageUrl: formData.get("pageUrl") || undefined,
      fields,
      unknownFieldPolicy: formData.get("unknownFieldPolicy") || undefined,
      contactIdentityRule: formData.get("contactIdentityRule") || undefined,
      attributionEnabled:
        formData.get("attributionEnabled") === null
          ? undefined
          : formData.get("attributionEnabled") === "true",
      isActive:
        formData.get("isActive") === null
          ? undefined
          : formData.get("isActive") === "true",
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }

    await updateFormForUser(user, formId, parsed.data);
    revalidatePath(`/websites/${websiteId}/forms`);
    revalidatePath(`/websites/${websiteId}/forms/${formId}`);
    revalidatePath(`/websites/${websiteId}/forms/${formId}/edit`);
    return { success: true, message: "Form updated." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteFormAction(
  websiteId: string,
  formId: string
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    await deactivateFormForUser(user, formId);
    revalidatePath(`/websites/${websiteId}/forms`);
    revalidatePath(`/websites/${websiteId}/forms/${formId}`);
    return { success: true, message: "Form deleted." };
  } catch (error) {
    return toActionError(error);
  }
}

function buildPayloadFromFormData(formData: FormData): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key === "validateOnly") {
      continue;
    }
    if (typeof value === "string") {
      if (value === "true") {
        payload[key] = true;
      } else if (value === "false") {
        payload[key] = false;
      } else {
        payload[key] = value;
      }
    }
  }
  return payload;
}

export async function testFormSubmissionAction(
  websiteId: string,
  formId: string,
  validateOnly: boolean,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const parsed = testFormSubmissionSchema.safeParse({
      payload: buildPayloadFromFormData(formData),
      validateOnly,
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }

    const result = await testFormSubmissionForUser(
      user,
      formId,
      parsed.data
    );

    if (!result.valid) {
      const detail =
        "errors" in result && result.errors
          ? result.errors.map((item: { message: string }) => item.message).join(" ")
          : "message" in result && typeof result.message === "string"
            ? result.message
            : "Validation failed.";
      return { success: false, message: detail };
    }

    if (parsed.data.validateOnly) {
      return {
        success: true,
        message:
          "message" in result && typeof result.message === "string"
            ? result.message
            : "Submission is valid.",
      };
    }

    revalidatePath("/leads");
    revalidatePath("/dashboard");
    return {
      success: true,
      message:
        "message" in result && typeof result.message === "string"
          ? result.message
          : "Test lead created.",
      data: {
        leadId: "leadId" in result ? result.leadId : undefined,
        leadNumber: "leadNumber" in result ? result.leadNumber : undefined,
      },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function bulkLeadAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    if (!canPerformBulkActions(user.role)) {
      throw new PermissionError("You are not allowed to perform bulk actions.");
    }

    const leadIdsRaw = String(formData.get("leadIds") ?? "[]");
    const leadIds = JSON.parse(leadIdsRaw) as string[];
    const action = String(formData.get("action") ?? "");

    let payload: unknown;
    if (action === "assign") {
      payload = {
        action,
        leadIds,
        assignedUserId:
          formData.get("assignedUserId") === ""
            ? null
            : String(formData.get("assignedUserId") ?? ""),
      };
    } else if (action === "change_status") {
      payload = {
        action,
        leadIds,
        salesStatus: String(formData.get("salesStatus") ?? "") || undefined,
        fulfilmentStatus:
          String(formData.get("fulfilmentStatus") ?? "") || undefined,
      };
    } else if (action === "change_priority") {
      payload = {
        action,
        leadIds,
        priority: String(formData.get("priority") ?? "normal"),
      };
    } else if (action === "mark_spam") {
      payload = { action, leadIds };
    } else {
      return { success: false, message: "Unknown bulk action." };
    }

    const parsed = bulkLeadActionSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Invalid bulk action.",
      };
    }

    const result = await bulkUpdateLeadsForUser(user, parsed.data);
    revalidatePath("/leads");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Updated ${result.updated} lead(s).`,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function saveLeadViewAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const filtersRaw = String(formData.get("filters") ?? "{}");
    const visibleColumnsRaw = String(formData.get("visibleColumns") ?? "[]");

    const parsed = saveLeadViewSchema.safeParse({
      name: formData.get("name"),
      filters: JSON.parse(filtersRaw),
      visibleColumns: JSON.parse(visibleColumnsRaw),
      isDefault: formData.get("isDefault") === "true",
      viewMode: formData.get("viewMode") || undefined,
      selectedYear: formData.get("selectedYear") || undefined,
      selectedMonth: formData.get("selectedMonth") || undefined,
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }

    await saveLeadViewForUser(user, parsed.data);
    revalidatePath("/leads");
    return { success: true, message: "View saved." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteLeadViewAction(viewId: string): Promise<ActionResult> {
  try {
    const user = await requireSession();
    await deleteLeadViewForUser(user, viewId);
    revalidatePath("/leads");
    return { success: true, message: "View deleted." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function importLeadsAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    if (!canImportLeads(user.role)) {
      throw new PermissionError("You are not allowed to import leads.");
    }

    const parsed = importColumnMappingSchema.safeParse({
      websiteId: formData.get("websiteId"),
      mappings: JSON.parse(String(formData.get("mappings") ?? "{}")),
      rows: JSON.parse(String(formData.get("rows") ?? "[]")),
      defaultSalesStatus: formData.get("defaultSalesStatus") || "new",
      defaultPriority: formData.get("defaultPriority") || "normal",
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }

    const result = await importLeadsFromMappedRows(user, parsed.data);
    revalidatePath("/leads");
    revalidatePath("/dashboard");
    return {
      success: true,
      message: `Imported ${result.imported} lead(s). Skipped ${result.skipped}.`,
      data: { errors: result.errors },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function mergeContactsAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const parsed = mergeContactsSchema.safeParse({
      primaryContactId: formData.get("primaryContactId"),
      secondaryContactId: formData.get("secondaryContactId"),
      preserveFrom: formData.get("preserveFrom") || "primary",
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }

    await mergeContactsForUser(user, parsed.data);
    revalidatePath("/contacts");
    revalidatePath("/contacts/duplicates");
    return { success: true, message: "Contacts merged." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function markAllNotificationsReadAction(): Promise<void> {
  try {
    const user = await requireSession();
    const { markAllNotificationsReadForUser } = await import(
      "@/services/notifications.service"
    );
    await markAllNotificationsReadForUser(user);
    revalidatePath("/notifications");
  } catch (error) {
    console.error("[notifications]", error);
  }
}

export async function markNotificationReadAction(
  notificationId: string
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const { markNotificationReadForUser } = await import(
      "@/services/notifications.service"
    );
    await markNotificationReadForUser(user, notificationId);
    revalidatePath("/notifications");
    return { success: true, message: "Notification marked as read." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createInvitationAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const { createInvitationSchema } = await import(
      "@/lib/validation/invitation.schema"
    );
    const { createInvitationForAdmin } = await import(
      "@/services/invitations.service"
    );

    const websiteIds = formData.getAll("permittedWebsiteIds").map(String);
    const parsed = createInvitationSchema.safeParse({
      email: formData.get("email"),
      invitedName: formData.get("invitedName") || undefined,
      role: formData.get("role"),
      permittedWebsiteIds: websiteIds,
      canReceiveLeadAssignments: formData.get("canReceiveLeadAssignments") === "true",
      canViewUnassignedLeads: formData.get("canViewUnassignedLeads") === "true",
      note: formData.get("note") || undefined,
      expiryHours: Number(formData.get("expiryHours") || 168),
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }

    const { invitation, token } = await createInvitationForAdmin(user, parsed.data);
    const appUrl = process.env.APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
    const inviteLink = `${appUrl}/invite/${token}`;

    revalidatePath("/settings/users/invitations");
    return {
      success: true,
      message: "Invitation created.",
      data: {
        invitationId: invitation._id.toHexString(),
        inviteLink,
      },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function revokeInvitationAction(
  invitationId: string
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const { revokeInvitationForAdmin } = await import(
      "@/services/invitations.service"
    );
    await revokeInvitationForAdmin(user, invitationId);
    revalidatePath("/settings/users/invitations");
    return { success: true, message: "Invitation revoked." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function regenerateInvitationAction(
  invitationId: string
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const { regenerateInvitationForAdmin } = await import(
      "@/services/invitations.service"
    );
    const { invitation, token } = await regenerateInvitationForAdmin(
      user,
      invitationId
    );
    const appUrl = process.env.APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
    revalidatePath("/settings/users/invitations");
    return {
      success: true,
      message: "Invitation link regenerated.",
      data: {
        invitationId: invitation._id.toHexString(),
        inviteLink: `${appUrl}/invite/${token}`,
      },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function acceptInvitationAction(
  token: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { acceptInvitationSchema } = await import(
      "@/lib/validation/invitation.schema"
    );
    const { acceptInvitation } = await import("@/services/invitations.service");

    const parsed = acceptInvitationSchema.safeParse({
      name: formData.get("name"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }

    if (formData.get("password") !== formData.get("confirmPassword")) {
      return { success: false, message: "Passwords do not match." };
    }

    await acceptInvitation(token, parsed.data);
    return { success: true, message: "Account created. You can sign in now." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function transferLeadsAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const { transferLeadsSchema } = await import(
      "@/lib/validation/dashboard-share.schema"
    );
    const { transferLeadsForAdmin } = await import("@/services/users.service");

    const parsed = transferLeadsSchema.safeParse({
      fromUserId: formData.get("fromUserId"),
      toUserId: formData.get("toUserId") || undefined,
      websiteId: formData.get("websiteId") || undefined,
      unassignOnly: formData.get("unassignOnly") === "true",
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }

    const result = await transferLeadsForAdmin(user, parsed.data);
    revalidatePath("/leads");
    revalidatePath("/settings/users");
    return {
      success: true,
      message: `Transferred ${result.transferred} lead(s).`,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeWebsiteAccessAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const { removeWebsiteAccessSchema } = await import(
      "@/lib/validation/dashboard-share.schema"
    );
    const { removeWebsiteAccessForAdmin } = await import(
      "@/services/users.service"
    );

    const parsed = removeWebsiteAccessSchema.safeParse({
      userId: formData.get("userId"),
      websiteId: formData.get("websiteId"),
      reassignToUserId: formData.get("reassignToUserId") || undefined,
      unassignLeads: formData.get("unassignLeads") !== "false",
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }

    const result = await removeWebsiteAccessForAdmin(user, parsed.data);
    revalidatePath(`/websites/${parsed.data.websiteId}/team`);
    return {
      success: true,
      message: `Website access removed. ${result.leadsUpdated} lead(s) updated.`,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addWebsiteAccessAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const { addWebsiteAccessForAdmin } = await import(
      "@/services/users.service"
    );

    const userId = String(formData.get("userId") ?? "");
    const websiteId = String(formData.get("websiteId") ?? "");
    if (!userId || !websiteId) {
      return { success: false, message: "User and website are required." };
    }

    await addWebsiteAccessForAdmin(user, userId, websiteId);
    revalidatePath(`/websites/${websiteId}/team`);
    return { success: true, message: "User added to website team." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createDashboardShareAction(
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const { createDashboardShareSchema } = await import(
      "@/lib/validation/dashboard-share.schema"
    );
    const { createShareForWebsite } = await import(
      "@/services/dashboard-shares.service"
    );

    const websiteId = String(formData.get("websiteId") ?? "");
    const parsed = createDashboardShareSchema.safeParse({
      name: formData.get("name"),
      title: formData.get("title"),
      periodPreset: formData.get("periodPreset"),
      customStartDate: formData.get("customStartDate") || undefined,
      customEndDate: formData.get("customEndDate") || undefined,
      visibleMetrics: JSON.parse(String(formData.get("visibleMetrics") ?? "[]")),
      visibleCharts: JSON.parse(String(formData.get("visibleCharts") ?? "[]")),
      visibleTables: JSON.parse(String(formData.get("visibleTables") ?? "[]")),
      branding: JSON.parse(String(formData.get("branding") ?? "{}")),
      access: JSON.parse(String(formData.get("access") ?? "{}")),
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }

    const share = await createShareForWebsite(user, websiteId, parsed.data);
    revalidatePath(`/websites/${websiteId}/performance/shares`);
    return {
      success: true,
      message: "Dashboard share created.",
      data: { shareId: share._id.toHexString() },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateDashboardShareAction(
  shareId: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const { updateDashboardShareSchema } = await import(
      "@/lib/validation/dashboard-share.schema"
    );
    const { updateShareForWebsite } = await import(
      "@/services/dashboard-shares.service"
    );

    const payload: Record<string, unknown> = {};
    if (formData.get("name")) payload.name = formData.get("name");
    if (formData.get("title")) payload.title = formData.get("title");
    if (formData.get("periodPreset")) {
      payload.periodPreset = formData.get("periodPreset");
    }
    if (formData.has("status")) payload.status = formData.get("status");
    if (formData.get("branding")) {
      payload.branding = JSON.parse(String(formData.get("branding")));
    }
    if (formData.get("access")) {
      payload.access = JSON.parse(String(formData.get("access")));
    }

    const parsed = updateDashboardShareSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }

    const share = await updateShareForWebsite(user, shareId, parsed.data);
    revalidatePath(`/websites/${share.websiteId}/performance/shares`);
    return { success: true, message: "Dashboard share updated." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function revokeDashboardShareAction(
  shareId: string
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const { revokeShareForWebsite } = await import(
      "@/services/dashboard-shares.service"
    );
    await revokeShareForWebsite(user, shareId);
    revalidatePath("/websites");
    return { success: true, message: "Dashboard share revoked." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function regenerateDashboardShareSlugAction(
  shareId: string
): Promise<ActionResult> {
  try {
    const user = await requireSession();
    const { regenerateShareSlugForWebsite } = await import(
      "@/services/dashboard-shares.service"
    );
    const share = await regenerateShareSlugForWebsite(user, shareId);
    const appUrl = process.env.APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
    return {
      success: true,
      message: "Share link regenerated.",
      data: { shareUrl: `${appUrl}/dashboard-share/${share.shareSlug}` },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function verifyDashboardSharePasswordAction(
  shareSlug: string,
  _prev: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { verifyDashboardSharePasswordSchema } = await import(
      "@/lib/validation/dashboard-share.schema"
    );
    const { verifySharePassword } = await import(
      "@/services/dashboard-shares.service"
    );
    const { cookies } = await import("next/headers");

    const parsed = verifyDashboardSharePasswordSchema.safeParse({
      password: formData.get("password"),
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Validation failed.",
      };
    }

    const result = await verifySharePassword(shareSlug, parsed.data.password);
    if (!result.ok) {
      return {
        success: false,
        message:
          result.status === "password_failed"
            ? "Incorrect password."
            : "This dashboard is no longer available.",
      };
    }

    const cookieStore = await cookies();
    cookieStore.set(
      result.cookieName,
      result.cookieValue,
      result.cookieOptions
    );

    return { success: true, message: "Access granted." };
  } catch (error) {
    return toActionError(error);
  }
}
