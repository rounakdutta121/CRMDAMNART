import type { AiAgentScope } from "@/types/ai-agent";

/** Plain JSON-safe agent shape for Client Components. */
export type AiAgentClientView = {
  id: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  scopes: AiAgentScope[];
  permittedWebsiteIds: string[];
  isActive: boolean;
  createdByUserId: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
