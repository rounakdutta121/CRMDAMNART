import { ObjectId } from "mongodb";
import { hashPassword } from "@/lib/crypto";
import { normalizeEmail } from "@/lib/normalization";
import {
  defaultCanReceiveLeadAssignments,
  defaultCanViewUnassignedLeads,
} from "@/lib/permissions";
import {
  createUser,
  findUserByNormalizedEmail,
  listAssignableUsers,
  listUsers,
  updateUserPassword,
} from "@/repositories/users.repository";
import type { SafeCRMUser, UserRole } from "@/types/auth";

export async function ensureAdminUser(options: {
  name: string;
  email: string;
  password: string;
  resetPassword?: boolean;
}): Promise<{ created: boolean; reset: boolean; user: SafeCRMUser }> {
  const normalizedEmail = normalizeEmail(options.email);
  const existing = await findUserByNormalizedEmail(normalizedEmail);

  if (existing) {
    if (options.resetPassword) {
      const passwordHash = await hashPassword(options.password);
      await updateUserPassword(existing._id.toHexString(), passwordHash);
      const refreshed = await findUserByNormalizedEmail(normalizedEmail);
      if (!refreshed) {
        throw new Error("Administrator not found after password reset.");
      }
      const { passwordHash: _, ...safe } = refreshed;
      void _;
      return { created: false, reset: true, user: safe };
    }

    const { passwordHash: _, ...safe } = existing;
    void _;
    return { created: false, reset: false, user: safe };
  }

  const passwordHash = await hashPassword(options.password);
  const now = new Date();

  const user = await createUser({
    name: options.name,
    email: options.email.trim(),
    normalizedEmail,
    passwordHash,
    role: "super_admin" as UserRole,
    permittedWebsiteIds: [],
    canReceiveLeadAssignments: defaultCanReceiveLeadAssignments("super_admin"),
    canViewUnassignedLeads: defaultCanViewUnassignedLeads("super_admin"),
    isActive: true,
    sessionVersion: 1,
    createdAt: now,
    updatedAt: now,
  });

  return { created: true, reset: false, user };
}

export async function getUsersForSettings(): Promise<SafeCRMUser[]> {
  return listUsers();
}

export async function getAssignableUsers(
  websiteIds?: string[]
): Promise<SafeCRMUser[]> {
  return listAssignableUsers(websiteIds);
}

export function userDisplayMap(
  users: SafeCRMUser[]
): Map<string, string> {
  return new Map(users.map((user) => [user._id.toHexString(), user.name]));
}

export function toObjectIds(ids: string[]): ObjectId[] {
  return ids.map((id) => new ObjectId(id));
}
