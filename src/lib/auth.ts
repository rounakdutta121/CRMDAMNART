import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth.config";
import {
  defaultCanReceiveLeadAssignments,
  defaultCanViewUnassignedLeads,
} from "@/lib/permissions";
import { verifyPassword } from "@/lib/crypto";
import { logger } from "@/lib/logger";
import { normalizeEmail } from "@/lib/normalization";
import {
  checkLoginBlocked,
  clearLoginAttempts,
  recordLoginFailure,
} from "@/repositories/login-attempts.repository";
import { findUserByNormalizedEmail } from "@/repositories/users.repository";
import { writeAuditLog } from "@/lib/audit";
import type { SessionUser, UserRole } from "@/types/auth";

declare module "next-auth" {
  interface User {
    role: UserRole;
    permittedWebsiteIds: string[];
    canReceiveLeadAssignments: boolean;
    canViewUnassignedLeads: boolean;
    sessionVersion: number;
  }

  interface Session {
    user: SessionUser;
  }

  interface JWT {
    id?: string;
    role?: UserRole;
    permittedWebsiteIds?: string[];
    canReceiveLeadAssignments?: boolean;
    canViewUnassignedLeads?: boolean;
    sessionVersion?: number;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string" ? credentials.email : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) {
          return null;
        }

        const normalized = normalizeEmail(email);

        try {
          const blocked = await checkLoginBlocked(normalized);
          if (blocked.blocked) {
            return null;
          }

          const user = await findUserByNormalizedEmail(normalized);

          if (!user || !user.isActive) {
            await recordLoginFailure(normalized);
            return null;
          }

          const valid = await verifyPassword(password, user.passwordHash);
          if (!valid) {
            await recordLoginFailure(normalized);
            return null;
          }

          await clearLoginAttempts(normalized);

          try {
            await writeAuditLog({
              actingUserId: user._id.toHexString(),
              action: "user.login",
              entityType: "user",
              entityId: user._id,
            });
          } catch (error) {
            logger.error("[auth] Failed to write login audit log", error);
          }

          return {
            id: user._id.toHexString(),
            name: user.name,
            email: user.email,
            role: user.role,
            permittedWebsiteIds: user.permittedWebsiteIds.map((id) =>
              id.toHexString()
            ),
            canReceiveLeadAssignments:
              user.canReceiveLeadAssignments ??
              defaultCanReceiveLeadAssignments(user.role),
            canViewUnassignedLeads:
              user.canViewUnassignedLeads ??
              defaultCanViewUnassignedLeads(user.role),
            sessionVersion: user.sessionVersion ?? 1,
          };
        } catch (error) {
          logger.error("[auth] Login failed due to server/database error", error);
          return null;
        }
      },
    }),
  ],
});

export async function requireSession(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }

  const user = await findUserByNormalizedEmail(
    normalizeEmail(session.user.email)
  );

  if (!user || !user.isActive) {
    throw new Error("UNAUTHORIZED");
  }

  const tokenVersion = session.user.sessionVersion ?? 1;
  const dbVersion = user.sessionVersion ?? 1;

  if (tokenVersion !== dbVersion) {
    throw new Error("SESSION_INVALIDATED");
  }

  return {
    ...session.user,
    sessionVersion: dbVersion,
    permittedWebsiteIds: user.permittedWebsiteIds.map((id) => id.toHexString()),
    role: user.role,
    name: user.name,
    canReceiveLeadAssignments:
      user.canReceiveLeadAssignments ??
      defaultCanReceiveLeadAssignments(user.role),
    canViewUnassignedLeads:
      user.canViewUnassignedLeads ??
      defaultCanViewUnassignedLeads(user.role),
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    return await requireSession();
  } catch {
    return null;
  }
}
