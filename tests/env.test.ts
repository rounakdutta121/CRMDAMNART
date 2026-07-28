import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertProductionSafeSeedPassword,
  getServerEnv,
  resetServerEnvCacheForTests,
} from "@/lib/env";

beforeEach(() => {
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017";
  process.env.MONGODB_DB = "damnart_crm_test";
  process.env.AUTH_SECRET = "test-auth-secret-with-32-characters-minimum";
  resetServerEnvCacheForTests();
});

describe("getServerEnv", () => {
  it("parses required environment variables", () => {
    resetServerEnvCacheForTests();
    const env = getServerEnv();
    expect(env.MONGODB_URI.length).toBeGreaterThan(0);
    expect(env.MONGODB_DB.length).toBeGreaterThan(0);
    expect(env.AUTH_SECRET.length).toBeGreaterThanOrEqual(32);
  });
});

describe("assertProductionSafeSeedPassword", () => {
  it("rejects known example passwords in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => assertProductionSafeSeedPassword("password")).toThrow(
      /example password/i
    );
    vi.unstubAllEnvs();
  });

  it("allows strong passwords in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(() =>
      assertProductionSafeSeedPassword("MyUniqueSecurePass!2026")
    ).not.toThrow();
    vi.unstubAllEnvs();
  });
});
