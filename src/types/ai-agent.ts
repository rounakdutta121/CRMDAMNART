import type { ObjectId } from "mongodb";

export const AI_AGENT_SCOPES = [
  "leads:read",
  "leads:write",
  "leads:assign",
  "leads:delete",
  "leads:import",
  "leads:export",
  "contacts:read",
  "contacts:write",
  "contacts:merge",
  "websites:read",
  "websites:write",
  "websites:delete",
  "websites:all",
  "forms:read",
  "forms:write",
  "forms:delete",
  "services:read",
  "services:write",
  "analytics:read",
  "users:read",
  "users:write",
] as const;

export type AiAgentScope = (typeof AI_AGENT_SCOPES)[number];

export const DEFAULT_AI_AGENT_SCOPES: AiAgentScope[] = [
  "leads:read",
  "contacts:read",
  "websites:read",
  "forms:read",
  "services:read",
  "analytics:read",
];

export interface AiAgent {
  _id: ObjectId;
  name: string;
  description?: string;
  keyPrefix: string;
  apiKeyHash: string;
  scopes: AiAgentScope[];
  permittedWebsiteIds: ObjectId[];
  isActive: boolean;
  createdByUserId: ObjectId;
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type SafeAiAgent = Omit<AiAgent, "apiKeyHash">;

export const AI_AGENT_SCOPE_LABELS: Record<AiAgentScope, string> = {
  "leads:read": "Read leads",
  "leads:write": "Create/update leads",
  "leads:assign": "Assign leads",
  "leads:delete": "Delete leads",
  "leads:import": "Import leads",
  "leads:export": "Export leads",
  "contacts:read": "Read contacts",
  "contacts:write": "Update contacts",
  "contacts:merge": "Merge contacts",
  "websites:read": "Read websites",
  "websites:write": "Create/update websites",
  "websites:delete": "Delete websites",
  "websites:all": "All websites (bypass allowlist)",
  "forms:read": "Read forms",
  "forms:write": "Create/update forms",
  "forms:delete": "Deactivate forms",
  "services:read": "Read services",
  "services:write": "Create/update services",
  "analytics:read": "Read analytics",
  "users:read": "Read users",
  "users:write": "Manage users",
};
