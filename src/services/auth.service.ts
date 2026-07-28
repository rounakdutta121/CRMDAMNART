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
} from "@/repositories/users.repository";
import type { SafeCRMUser, UserRole } from "@/types/auth";

export async function ensureAdminUser(options: {
  name: string;
  email: string;
  password: string;
}): Promise<{ created: boolean; user: SafeCRMUser }> {
  const normalizedEmail = normalizeEmail(options.email);
  const existing = await findUserByNormalizedEmail(normalizedEmail);

  if (existing) {
    const { passwordHash: _, ...safe } = existing;
    void _;
    return { created: false, user: safe };
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

  return { created: true, user };
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
