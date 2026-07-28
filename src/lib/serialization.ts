import { ObjectId } from "mongodb";

export function toObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) {
    throw new Error(`Invalid ObjectId: ${id}`);
  }
  return new ObjectId(id);
}

export function tryObjectId(id: string | undefined | null): ObjectId | undefined {
  if (!id || !ObjectId.isValid(id)) {
    return undefined;
  }
  return new ObjectId(id);
}

export function serializeId(id: ObjectId | string): string {
  return typeof id === "string" ? id : id.toHexString();
}

export function serializeDate(date: Date | undefined | null): string | null {
  if (!date) {
    return null;
  }
  return date.toISOString();
}

export function omitFields<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

function isObjectId(value: unknown): value is ObjectId {
  return (
    value instanceof ObjectId ||
    (typeof value === "object" &&
      value !== null &&
      "_bsontype" in value &&
      (value as { _bsontype?: string })._bsontype === "ObjectId")
  );
}

/**
 * Deep-convert MongoDB documents into JSON-safe plain objects
 * suitable for passing from Server Components to Client Components.
 */
export function serializeMongo<T>(value: T): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (isObjectId(value)) {
    return value.toHexString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeMongo(item));
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      result[key] = serializeMongo(nested);
    }
    return result;
  }

  return value;
}

export type Serialized<T> = T extends ObjectId
  ? string
  : T extends Date
    ? string
    : T extends Array<infer U>
      ? Serialized<U>[]
      : T extends object
        ? { [K in keyof T]: Serialized<T[K]> }
        : T;
