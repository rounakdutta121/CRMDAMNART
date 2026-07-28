import type { SessionUser, UserRole } from "@/types/auth";
import {
  getSessionUser,
  requireSession,
} from "@/lib/auth";
import { PermissionError } from "@/lib/permissions";

export async function getCurrentUser(): Promise<SessionUser | null> {
  return getSessionUser();
}

export async function requireAuthenticatedUser(): Promise<SessionUser> {
  try {
    return await requireSession();
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_INVALIDATED") {
      throw new PermissionError("Your session has expired. Please sign in again.");
    }
    throw new PermissionError("You must be signed in to perform this action.");
  }
}

export async function requireRole(
  allowedRoles: UserRole[]
): Promise<SessionUser> {
  const user = await requireAuthenticatedUser();
  if (!allowedRoles.includes(user.role)) {
    throw new PermissionError("You do not have permission to perform this action.");
  }
  return user;
}

export async function requirePermission(
  check: (role: UserRole) => boolean,
  message = "You do not have permission to perform this action."
): Promise<SessionUser> {
  const user = await requireAuthenticatedUser();
  if (!check(user.role)) {
    throw new PermissionError(message);
  }
  return user;
}
