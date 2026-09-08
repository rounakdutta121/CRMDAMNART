import { z } from "zod";
import { AI_AGENT_SCOPES, DEFAULT_AI_AGENT_SCOPES } from "@/types/ai-agent";

const scopeEnum = z.enum(
  AI_AGENT_SCOPES as unknown as [string, ...string[]]
);

export const createAiAgentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  scopes: z
    .array(scopeEnum)
    .min(1, "Select at least one scope.")
    .default([...DEFAULT_AI_AGENT_SCOPES]),
  permittedWebsiteIds: z.array(z.string().min(1)).default([]),
  expiresAt: z.string().datetime().optional().or(z.literal("")),
});

export const updateAiAgentSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  scopes: z.array(scopeEnum).min(1).optional(),
  permittedWebsiteIds: z.array(z.string().min(1)).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional().or(z.literal("")),
});

export type CreateAiAgentInput = z.infer<typeof createAiAgentSchema>;
export type UpdateAiAgentInput = z.infer<typeof updateAiAgentSchema>;
