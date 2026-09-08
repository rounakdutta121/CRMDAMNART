import { ObjectId, type WithId } from "mongodb";
import { COLLECTIONS } from "@/lib/constants";
import { getDb } from "@/lib/mongodb";
import type { AiAgent, AiAgentScope, SafeAiAgent } from "@/types/ai-agent";

function omitApiKeyHash(agent: AiAgent): SafeAiAgent {
  const { apiKeyHash: _, ...safe } = agent;
  void _;
  return safe;
}

export async function createAiAgent(
  input: Omit<AiAgent, "_id">
): Promise<SafeAiAgent> {
  const db = await getDb();
  const doc = { ...input } as AiAgent;
  const result = await db.collection<AiAgent>(COLLECTIONS.aiAgents).insertOne(doc);
  const created = await db
    .collection<AiAgent>(COLLECTIONS.aiAgents)
    .findOne({ _id: result.insertedId });
  if (!created) {
    throw new Error("Failed to create AI agent.");
  }
  return omitApiKeyHash(created);
}

export async function listAiAgents(): Promise<SafeAiAgent[]> {
  const db = await getDb();
  const agents = await db
    .collection<AiAgent>(COLLECTIONS.aiAgents)
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
  return agents.map(omitApiKeyHash);
}

export async function findAiAgentById(
  agentId: string
): Promise<SafeAiAgent | null> {
  if (!ObjectId.isValid(agentId)) return null;
  const db = await getDb();
  const agent = await db
    .collection<AiAgent>(COLLECTIONS.aiAgents)
    .findOne({ _id: new ObjectId(agentId) });
  return agent ? omitApiKeyHash(agent) : null;
}

export async function findAiAgentByApiKeyHash(
  apiKeyHash: string
): Promise<WithId<AiAgent> | null> {
  const db = await getDb();
  return db.collection<AiAgent>(COLLECTIONS.aiAgents).findOne({ apiKeyHash });
}

export async function updateAiAgentById(
  agentId: string,
  update: Partial<
    Pick<
      AiAgent,
      | "name"
      | "description"
      | "scopes"
      | "permittedWebsiteIds"
      | "isActive"
      | "expiresAt"
      | "apiKeyHash"
      | "keyPrefix"
      | "lastUsedAt"
      | "updatedAt"
    >
  >
): Promise<SafeAiAgent | null> {
  if (!ObjectId.isValid(agentId)) return null;
  const db = await getDb();
  const result = await db.collection<AiAgent>(COLLECTIONS.aiAgents).findOneAndUpdate(
    { _id: new ObjectId(agentId) },
    { $set: update },
    { returnDocument: "after" }
  );
  return result ? omitApiKeyHash(result) : null;
}

export async function touchAiAgentLastUsed(agentId: ObjectId): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTIONS.aiAgents).updateOne(
    { _id: agentId },
    { $set: { lastUsedAt: new Date(), updatedAt: new Date() } }
  );
}

export async function deleteAiAgentById(agentId: string): Promise<boolean> {
  if (!ObjectId.isValid(agentId)) return false;
  const db = await getDb();
  const result = await db
    .collection(COLLECTIONS.aiAgents)
    .deleteOne({ _id: new ObjectId(agentId) });
  return result.deletedCount === 1;
}

export async function setAiAgentScopes(
  agentId: string,
  scopes: AiAgentScope[]
): Promise<SafeAiAgent | null> {
  return updateAiAgentById(agentId, { scopes, updatedAt: new Date() });
}
