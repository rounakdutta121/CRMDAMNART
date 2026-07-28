import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/types/auth";
import {
  defaultCanReceiveLeadAssignments,
  defaultCanViewUnassignedLeads,
} from "@/lib/permissions";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 12,
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = Boolean(auth?.user);
      const isAuthPage =
        pathname.startsWith("/login") || pathname.startsWith("/invite");
      const isPublicShare = pathname.startsWith("/dashboard-share");
      const isPublicApi =
        pathname.startsWith("/api/v1/webhooks") ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/health") ||
        pathname.startsWith("/api/v1/export") ||
        pathname.startsWith("/api/v1/dashboard-share");

      if (isPublicApi || isPublicShare) {
        return true;
      }

      if (!isLoggedIn && !isAuthPage && pathname !== "/") {
        return false;
      }

      if (isLoggedIn && (isAuthPage || pathname === "/")) {
        return Response.redirect(new URL("/dashboard", request.nextUrl.origin));
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? "";
        token.role = user.role;
        token.permittedWebsiteIds = user.permittedWebsiteIds;
        token.canReceiveLeadAssignments = user.canReceiveLeadAssignments;
        token.canViewUnassignedLeads = user.canViewUnassignedLeads;
        token.sessionVersion = user.sessionVersion ?? 1;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      const role = (token.role as UserRole | undefined) ?? "viewer";
      const permittedWebsiteIds = Array.isArray(token.permittedWebsiteIds)
        ? (token.permittedWebsiteIds as string[])
        : [];

      const sessionUser = {
        id: typeof token.id === "string" ? token.id : "",
        name: typeof token.name === "string" ? token.name : "",
        email: typeof token.email === "string" ? token.email : "",
        role,
        permittedWebsiteIds,
        canReceiveLeadAssignments:
          typeof token.canReceiveLeadAssignments === "boolean"
            ? token.canReceiveLeadAssignments
            : defaultCanReceiveLeadAssignments(role),
        canViewUnassignedLeads:
          typeof token.canViewUnassignedLeads === "boolean"
            ? token.canViewUnassignedLeads
            : defaultCanViewUnassignedLeads(role),
        sessionVersion:
          typeof token.sessionVersion === "number" ? token.sessionVersion : 1,
      };

      session.user = sessionUser as typeof session.user;
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
