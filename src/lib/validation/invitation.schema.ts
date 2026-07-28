import { z } from "zod";
import { INVITATION_EXPIRY_HOURS, USER_ROLES } from "@/lib/constants";
import { strongPasswordSchema } from "@/lib/password-policy";

export const createInvitationSchema = z
  .object({
    email: z.string().trim().email("A valid email is required."),
    invitedName: z.string().trim().max(120).optional(),
    role: z.enum(USER_ROLES as [string, ...string[]]),
    permittedWebsiteIds: z.array(z.string()).default([]),
    canReceiveLeadAssignments: z.boolean().default(true),
    canViewUnassignedLeads: z.boolean().default(false),
    note: z.string().trim().max(500).optional(),
    expiryHours: z
      .union([
        z.literal(24),
        z.literal(72),
        z.literal(168),
        z.literal(336),
      ])
      .default(168),
  })
  .superRefine((data, ctx) => {
    if (data.role !== "super_admin" && data.permittedWebsiteIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Select at least one website for this invitation.",
        path: ["permittedWebsiteIds"],
      });
    }
  });

export const acceptInvitationSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(120),
  password: strongPasswordSchema,
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

export const INVITATION_EXPIRY_OPTIONS = INVITATION_EXPIRY_HOURS;
