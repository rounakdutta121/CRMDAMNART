import { z } from "zod";

const EXAMPLE_PASSWORDS = new Set([
  "changeme",
  "changethispassword123!",
  "password",
  "password123",
  "admin123",
]);

const serverEnvSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required."),
  MONGODB_DB: z
    .string()
    .min(1, "MONGODB_DB is required.")
    .regex(/^[a-zA-Z0-9_-]+$/, "MONGODB_DB must be a valid database name."),
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters."),
  AUTH_URL: z.string().url().optional(),
  AUTH_TRUST_HOST: z.enum(["true", "false"]).optional(),
  APP_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
  ALLOW_DEMO_SEED: z.enum(["true", "false"]).optional(),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().optional(),
  LOGIN_BLOCK_MINUTES: z.coerce.number().int().positive().optional(),
  WEBHOOK_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().optional(),
  WEBHOOK_RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | null = null;

function readProcessEnv(): Record<string, string | undefined> {
  return {
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB: process.env.MONGODB_DB,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
    APP_URL: process.env.APP_URL,
    NODE_ENV: process.env.NODE_ENV,
    ALLOW_DEMO_SEED: process.env.ALLOW_DEMO_SEED,
    LOGIN_MAX_ATTEMPTS: process.env.LOGIN_MAX_ATTEMPTS,
    LOGIN_BLOCK_MINUTES: process.env.LOGIN_BLOCK_MINUTES,
    WEBHOOK_RATE_LIMIT_PER_MINUTE: process.env.WEBHOOK_RATE_LIMIT_PER_MINUTE,
    WEBHOOK_RATE_LIMIT_PER_HOUR: process.env.WEBHOOK_RATE_LIMIT_PER_HOUR,
  };
}

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = serverEnvSchema.safeParse(readProcessEnv());
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => issue.message)
      .join("; ");
    throw new Error(`Invalid server environment configuration: ${message}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function getAuthSecret(): string {
  return getServerEnv().AUTH_SECRET;
}

export function getAppUrl(): string {
  const env = getServerEnv();
  const url = env.APP_URL ?? env.AUTH_URL ?? "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function assertProductionSafeSeedPassword(password: string): void {
  if (!isProduction()) {
    return;
  }

  const normalized = password.trim().toLowerCase();
  if (EXAMPLE_PASSWORDS.has(normalized)) {
    throw new Error(
      "Refusing to use a known example password in production. Set a strong SEED_ADMIN_PASSWORD."
    );
  }
}

export function resetServerEnvCacheForTests(): void {
  cachedEnv = null;
}
