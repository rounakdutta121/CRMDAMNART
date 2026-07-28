import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "damnart_dashboard_access";
const DEFAULT_TTL_MS = 12 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required.");
  }
  return secret;
}

function signPayload(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createDashboardAccessToken(
  shareId: string,
  expiresAtMs: number
): string {
  const payload = `${shareId}:${expiresAtMs}`;
  return `${payload}.${signPayload(payload)}`;
}

export function verifyDashboardAccessToken(
  token: string,
  shareId: string
): boolean {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return false;
  }

  const [tokenShareId, expiresAtRaw] = payload.split(":");
  if (tokenShareId !== shareId) {
    return false;
  }

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return false;
  }

  const expected = signPayload(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}

export function getDashboardAccessCookieName(): string {
  return COOKIE_NAME;
}

export function getDashboardAccessCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

export function buildDashboardAccessCookieValue(shareId: string): {
  value: string;
  expiresAt: Date;
} {
  const expiresAt = new Date(Date.now() + DEFAULT_TTL_MS);
  return {
    value: createDashboardAccessToken(shareId, expiresAt.getTime()),
    expiresAt,
  };
}
