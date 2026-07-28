import { z } from "zod";
import { USER_ROLES } from "@/lib/constants";
import { strongPasswordSchema } from "@/lib/password-policy";

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(120),
  email: z.string().trim().email("A valid email is required."),
  password: strongPasswordSchema,
  role: z.enum(USER_ROLES as [string, ...string[]]),
  permittedWebsiteIds: z.array(z.string()).default([]),
  canReceiveLeadAssignments: z.boolean().default(true),
  canViewUnassignedLeads: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().optional(),
  role: z.enum(USER_ROLES as [string, ...string[]]).optional(),
  permittedWebsiteIds: z.array(z.string()).optional(),
  canReceiveLeadAssignments: z.boolean().optional(),
  canViewUnassignedLeads: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  password: strongPasswordSchema,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
