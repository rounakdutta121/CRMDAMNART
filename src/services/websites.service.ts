import {
  generateApiKey,
  generateWebhookKey,
  hashApiKey,
} from "@/lib/crypto";
import {
  normalizeDomain,
  normalizeOptionalString,
  normalizeWebsiteCode,
} from "@/lib/normalization";
import { writeAuditLog } from "@/lib/audit";
import {
  canAccessWebsite,
  canManageWebsites,
  PermissionError,
} from "@/lib/permissions";
import type { CreateWebsiteInput, UpdateWebsiteInput } from "@/lib/validation/website.schema";
import {
  createWebsite,
  findWebsiteByCode,
  findWebsiteById,
  listWebsites,
  regenerateWebsiteApiKey,
  toSafeWebsite,
  updateWebsite,
} from "@/repositories/websites.repository";
import type { SessionUser } from "@/types/auth";
import type { SafeWebsite } from "@/types/website";
import { ObjectId } from "mongodb";

export async function getAccessibleWebsites(
  user: SessionUser,
  options?: { isActive?: boolean }
): Promise<SafeWebsite[]> {
  if (user.role === "super_admin") {
    return listWebsites({ isActive: options?.isActive });
  }

  return listWebsites({
    isActive: options?.isActive,
    ids: user.permittedWebsiteIds,
  });
}

export async function getWebsiteForUser(
  user: SessionUser,
  websiteId: string
): Promise<SafeWebsite> {
  if (!canAccessWebsite(user, websiteId)) {
    throw new PermissionError("You do not have access to this website.");
  }

  const website = await findWebsiteById(websiteId);
  if (!website) {
    throw new Error("Website not found.");
  }

  return toSafeWebsite(website);
}

export async function createWebsiteForUser(
  user: SessionUser,
  input: CreateWebsiteInput
): Promise<{ website: SafeWebsite; apiKey: string }> {
  if (!canManageWebsites(user.role)) {
    throw new PermissionError("You are not allowed to create websites.");
  }

  const code = normalizeWebsiteCode(input.code);
  const existing = await findWebsiteByCode(code);
  if (existing) {
    throw new Error("A website with this code already exists.");
  }

  const apiKey = generateApiKey();
  const now = new Date();

  const website = await createWebsite({
    name: input.name.trim(),
    code,
    primaryDomain: normalizeDomain(input.primaryDomain),
    additionalDomains: (input.additionalDomains ?? []).map(normalizeDomain),
    brandName: normalizeOptionalString(input.brandName),
    businessDivision: normalizeOptionalString(input.businessDivision),
    defaultCurrency: input.defaultCurrency.toUpperCase(),
    timezone: input.timezone,
    defaultLeadOwnerId: input.defaultLeadOwnerId
      ? new ObjectId(input.defaultLeadOwnerId)
      : undefined,
    webhookKey: generateWebhookKey(),
    apiKeyHash: hashApiKey(apiKey),
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    actingUserId: user.id,
    action: "website.created",
    entityType: "website",
    entityId: website._id,
    websiteId: website._id,
    newValues: {
      name: website.name,
      code: website.code,
      primaryDomain: website.primaryDomain,
      isActive: website.isActive,
    },
  });

  return { website: toSafeWebsite(website), apiKey };
}

export async function updateWebsiteForUser(
  user: SessionUser,
  websiteId: string,
  input: UpdateWebsiteInput
): Promise<SafeWebsite> {
  if (!canManageWebsites(user.role)) {
    throw new PermissionError("You are not allowed to edit websites.");
  }

  if (!canAccessWebsite(user, websiteId) && user.role !== "super_admin") {
    throw new PermissionError("You do not have access to this website.");
  }

  const existing = await findWebsiteById(websiteId);
  if (!existing) {
    throw new Error("Website not found.");
  }

  const update: Parameters<typeof updateWebsite>[1] = {};

  if (input.name !== undefined) update.name = input.name.trim();
  if (input.code !== undefined) {
    const code = normalizeWebsiteCode(input.code);
    const conflict = await findWebsiteByCode(code);
    if (conflict && conflict._id.toHexString() !== websiteId) {
      throw new Error("A website with this code already exists.");
    }
    update.code = code;
  }
  if (input.primaryDomain !== undefined) {
    update.primaryDomain = normalizeDomain(input.primaryDomain);
  }
  if (input.additionalDomains !== undefined) {
    update.additionalDomains = input.additionalDomains.map(normalizeDomain);
  }
  if (input.brandName !== undefined) {
    update.brandName = normalizeOptionalString(input.brandName);
  }
  if (input.businessDivision !== undefined) {
    update.businessDivision = normalizeOptionalString(input.businessDivision);
  }
  if (input.defaultCurrency !== undefined) {
    update.defaultCurrency = input.defaultCurrency.toUpperCase();
  }
  if (input.timezone !== undefined) update.timezone = input.timezone;
  if (input.isActive !== undefined) update.isActive = input.isActive;
  if (input.defaultLeadOwnerId !== undefined) {
    update.defaultLeadOwnerId = input.defaultLeadOwnerId
      ? new ObjectId(input.defaultLeadOwnerId)
      : undefined;
  }

  await updateWebsite(websiteId, update);

  const action =
    input.isActive === false && existing.isActive
      ? "website.deactivated"
      : "website.updated";

  await writeAuditLog({
    actingUserId: user.id,
    action,
    entityType: "website",
    entityId: websiteId,
    websiteId,
    previousValues: {
      name: existing.name,
      code: existing.code,
      isActive: existing.isActive,
    },
    newValues: update as Record<string, unknown>,
  });

  const updated = await findWebsiteById(websiteId);
  if (!updated) {
    throw new Error("Website not found after update.");
  }
  return toSafeWebsite(updated);
}

export async function regenerateApiKeyForUser(
  user: SessionUser,
  websiteId: string
): Promise<{ apiKey: string }> {
  if (!canManageWebsites(user.role)) {
    throw new PermissionError("You are not allowed to regenerate API keys.");
  }

  if (!canAccessWebsite(user, websiteId) && user.role !== "super_admin") {
    throw new PermissionError("You do not have access to this website.");
  }

  const existing = await findWebsiteById(websiteId);
  if (!existing) {
    throw new Error("Website not found.");
  }

  const apiKey = generateApiKey();
  await regenerateWebsiteApiKey(websiteId, hashApiKey(apiKey));

  await writeAuditLog({
    actingUserId: user.id,
    action: "website.api_key_regenerated",
    entityType: "website",
    entityId: websiteId,
    websiteId,
  });

  return { apiKey };
}
