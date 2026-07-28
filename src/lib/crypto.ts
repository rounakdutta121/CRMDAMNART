import { createHash, randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

export function generateApiKey(): string {
  return `da_${randomBytes(32).toString("base64url")}`;
}

export function generateWebhookKey(): string {
  return randomBytes(16).toString("base64url");
}

export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

export function verifyApiKey(apiKey: string, apiKeyHash: string): boolean {
  const incoming = Buffer.from(hashApiKey(apiKey), "utf8");
  const stored = Buffer.from(apiKeyHash, "utf8");

  if (incoming.length !== stored.length) {
    return false;
  }

  return timingSafeEqual(incoming, stored);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function generateSecureToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyTokenHash(token: string, tokenHash: string): boolean {
  const incoming = Buffer.from(hashToken(token), "utf8");
  const stored = Buffer.from(tokenHash, "utf8");
  if (incoming.length !== stored.length) {
    return false;
  }
  return timingSafeEqual(incoming, stored);
}
