const SENSITIVE_KEY_PATTERN =
  /password|passwordhash|apikey|apikeyhash|token|tokenhash|authorization|cookie|secret|privatekey|accesstoken|refreshtoken|gclid|gbraid|wbraid|email|phone|whatsapp/i;

function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return "[REDACTED]";
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => redactValue(String(index), item));
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const redacted: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(record)) {
      redacted[childKey] = redactValue(childKey, childValue);
    }
    return redacted;
  }

  return value;
}

function formatPayload(payload: unknown): unknown {
  if (payload === undefined) {
    return undefined;
  }

  if (payload instanceof Error) {
    return {
      name: payload.name,
      message: payload.message,
    };
  }

  if (typeof payload === "object" && payload !== null && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>;
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
      redacted[key] = redactValue(key, value);
    }
    return redacted;
  }

  return payload;
}

function writeLog(
  level: "info" | "warn" | "error",
  message: string,
  payload?: unknown
): void {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(payload !== undefined ? { data: formatPayload(payload) } : {}),
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const logger = {
  info(message: string, payload?: unknown): void {
    writeLog("info", message, payload);
  },
  warn(message: string, payload?: unknown): void {
    writeLog("warn", message, payload);
  },
  error(message: string, payload?: unknown): void {
    writeLog("error", message, payload);
  },
};
