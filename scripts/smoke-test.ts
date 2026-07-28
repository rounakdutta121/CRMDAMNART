const baseUrl = process.env.SMOKE_TEST_URL ?? "http://localhost:3000";

async function checkHealth(): Promise<boolean> {
  const response = await fetch(`${baseUrl}/api/health`, {
    cache: "no-store",
  });
  if (!response.ok) {
    console.error(`Health check failed with status ${response.status}`);
    return false;
  }

  const body = (await response.json()) as { status?: string; database?: string };
  if (body.status !== "ok" || body.database !== "connected") {
    console.error("Health check returned unexpected payload:", body);
    return false;
  }

  return true;
}

async function checkLoginPage(): Promise<boolean> {
  const response = await fetch(`${baseUrl}/login`, { cache: "no-store" });
  if (!response.ok) {
    console.error(`Login page check failed with status ${response.status}`);
    return false;
  }
  return true;
}

async function checkProtectedRedirect(): Promise<boolean> {
  const response = await fetch(`${baseUrl}/dashboard`, {
    redirect: "manual",
    cache: "no-store",
  });
  if (response.status !== 307 && response.status !== 302) {
    console.error(`Protected route did not redirect (status ${response.status})`);
    return false;
  }
  return true;
}

async function main() {
  console.log(`Running smoke tests against ${baseUrl}…`);

  const checks = [
    ["Health endpoint", checkHealth],
    ["Login page", checkLoginPage],
    ["Protected route redirect", checkProtectedRedirect],
  ] as const;

  let failed = 0;
  for (const [name, fn] of checks) {
    const ok = await fn();
    console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
    if (!ok) {
      failed += 1;
    }
  }

  if (failed > 0) {
    process.exit(1);
  }

  console.log("Smoke tests passed.");
}

main().catch((error) => {
  console.error("Smoke test runner failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
