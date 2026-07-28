const BLOCKED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export function isSafeFieldKey(key: string): boolean {
  if (!key || key.length > 100) {
    return false;
  }
  if (BLOCKED_KEYS.has(key)) {
    return false;
  }
  if (key.startsWith("$")) {
    return false;
  }
  if (key.includes("\0")) {
    return false;
  }
  if (/[[\]]/.test(key)) {
    return false;
  }
  return true;
}

export function resolveValueFromPayload(
  payload: Record<string, unknown>,
  key: string
): unknown {
  if (!isSafeFieldKey(key)) {
    return undefined;
  }

  if (key in payload) {
    return payload[key];
  }

  if (key.includes(".")) {
    const parts = key.split(".");
    let current: unknown = payload;
    for (const part of parts) {
      if (!isSafeFieldKey(part)) {
        return undefined;
      }
      if (
        current === null ||
        current === undefined ||
        typeof current !== "object" ||
        Array.isArray(current)
      ) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  return undefined;
}

export function resolveFieldValue(
  payload: Record<string, unknown>,
  incomingKey: string,
  aliases: string[]
): unknown {
  const keys = [incomingKey, ...aliases];
  for (const key of keys) {
    const value = resolveValueFromPayload(payload, key);
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
}

export function collectPayloadFieldNames(
  payload: Record<string, unknown>,
  prefix = ""
): string[] {
  const names: string[] = [];
  for (const [key, value] of Object.entries(payload)) {
    if (!isSafeFieldKey(key)) {
      continue;
    }
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      key === "attribution"
    ) {
      names.push(...collectPayloadFieldNames(value as Record<string, unknown>, fullKey));
    } else {
      names.push(fullKey);
    }
  }
  return names;
}

export function flattenPayload(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...payload };
  const attribution = payload.attribution;
  if (
    attribution &&
    typeof attribution === "object" &&
    !Array.isArray(attribution)
  ) {
    for (const [key, value] of Object.entries(attribution)) {
      if (isSafeFieldKey(key)) {
        result[`attribution.${key}`] = value;
        if (!(key in result)) {
          result[key] = value;
        }
      }
    }
  }
  return result;
}
