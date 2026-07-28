const ALLOWED_PREFIXES = [
  "/dashboard",
  "/leads",
  "/contacts",
  "/websites",
  "/follow-ups",
  "/notifications",
  "/settings",
  "/login",
  "/invite",
];

export function sanitizeInternalRedirectPath(
  value: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  if (trimmed.includes("://") || trimmed.includes("\\")) {
    return fallback;
  }

  const pathOnly = trimmed.split("?")[0]?.split("#")[0] ?? trimmed;
  const allowed = ALLOWED_PREFIXES.some(
    (prefix) => pathOnly === prefix || pathOnly.startsWith(`${prefix}/`)
  );

  return allowed ? trimmed : fallback;
}
