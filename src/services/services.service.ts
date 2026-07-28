import { ObjectId } from "mongodb";
import { writeAuditLog } from "@/lib/audit";
import { normalizeWebsiteCode } from "@/lib/normalization";
import {
  assertCanAccessWebsite,
  canManageServices,
  PermissionError,
} from "@/lib/permissions";
import type {
  CreateServiceInput,
  UpdateServiceInput,
} from "@/lib/validation/service.schema";
import {
  createService,
  findServiceByCode,
  findServiceById,
  listServices,
  listServicesForWebsite,
  updateService,
} from "@/repositories/services.repository";
import type { SessionUser } from "@/types/auth";
import type { CRMService } from "@/types/service";

export async function getServicesForUser(
  user: SessionUser,
  options?: { websiteId?: string; isActive?: boolean }
): Promise<CRMService[]> {
  if (!canManageServices(user.role) && user.role !== "sales_manager") {
    throw new PermissionError("You are not allowed to view services.");
  }

  if (options?.websiteId) {
    assertCanAccessWebsite(user, options.websiteId);
    return listServicesForWebsite(options.websiteId, {
      isActive: options.isActive,
    });
  }

  return listServices({ isActive: options?.isActive });
}

export async function getServiceForUser(
  user: SessionUser,
  serviceId: string
): Promise<CRMService> {
  if (!canManageServices(user.role) && user.role !== "sales_manager") {
    throw new PermissionError("You are not allowed to view services.");
  }

  const service = await findServiceById(serviceId);
  if (!service) {
    throw new Error("Service not found.");
  }

  const hasAccess = service.websiteIds.some((websiteId) =>
    user.role === "super_admin"
      ? true
      : user.permittedWebsiteIds.includes(websiteId.toHexString())
  );

  if (!hasAccess) {
    throw new PermissionError("You do not have access to this service.");
  }

  return service;
}

export async function createServiceForUser(
  user: SessionUser,
  input: CreateServiceInput
): Promise<CRMService> {
  if (!canManageServices(user.role)) {
    throw new PermissionError("You are not allowed to create services.");
  }

  for (const websiteId of input.websiteIds) {
    assertCanAccessWebsite(user, websiteId);
  }

  const code = normalizeWebsiteCode(input.code);
  const existing = await findServiceByCode(code);
  if (existing) {
    throw new Error("A service with this code already exists.");
  }

  const now = new Date();
  const service = await createService({
    name: input.name.trim(),
    code,
    category: input.category?.trim(),
    description: input.description?.trim(),
    websiteIds: input.websiteIds.map((id) => new ObjectId(id)),
    defaultLeadValue: input.defaultLeadValue,
    defaultCurrency: input.defaultCurrency.toUpperCase(),
    defaultLeadOwnerId: input.defaultLeadOwnerId
      ? new ObjectId(input.defaultLeadOwnerId)
      : undefined,
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  });

  await writeAuditLog({
    actingUserId: user.id,
    action: "service.created",
    entityType: "integration",
    entityId: service._id,
    newValues: {
      name: service.name,
      code: service.code,
      websiteIds: input.websiteIds,
    },
  });

  return service;
}

export async function updateServiceForUser(
  user: SessionUser,
  serviceId: string,
  input: UpdateServiceInput
): Promise<CRMService> {
  if (!canManageServices(user.role)) {
    throw new PermissionError("You are not allowed to update services.");
  }

  const existing = await findServiceById(serviceId);
  if (!existing) {
    throw new Error("Service not found.");
  }

  if (input.websiteIds) {
    for (const websiteId of input.websiteIds) {
      assertCanAccessWebsite(user, websiteId);
    }
  }

  const update: Parameters<typeof updateService>[1] = {};

  if (input.name !== undefined) update.name = input.name.trim();
  if (input.category !== undefined) update.category = input.category.trim();
  if (input.description !== undefined) {
    update.description = input.description.trim();
  }
  if (input.websiteIds !== undefined) {
    update.websiteIds = input.websiteIds.map((id) => new ObjectId(id));
  }
  if (input.defaultLeadValue !== undefined) {
    update.defaultLeadValue = input.defaultLeadValue;
  }
  if (input.defaultCurrency !== undefined) {
    update.defaultCurrency = input.defaultCurrency.toUpperCase();
  }
  if (input.defaultLeadOwnerId !== undefined) {
    update.defaultLeadOwnerId = input.defaultLeadOwnerId
      ? new ObjectId(input.defaultLeadOwnerId)
      : undefined;
  }
  if (input.isActive !== undefined) update.isActive = input.isActive;

  await updateService(serviceId, update);

  await writeAuditLog({
    actingUserId: user.id,
    action:
      input.isActive === false && existing.isActive
        ? "service.deactivated"
        : "service.updated",
    entityType: "integration",
    entityId: serviceId,
    previousValues: {
      name: existing.name,
      isActive: existing.isActive,
    },
    newValues: update as Record<string, unknown>,
  });

  const updated = await findServiceById(serviceId);
  if (!updated) {
    throw new Error("Service not found after update.");
  }
  return updated;
}

export async function deactivateServiceForUser(
  user: SessionUser,
  serviceId: string
): Promise<CRMService> {
  return updateServiceForUser(user, serviceId, { isActive: false });
}
