import { MongoClient, type Db } from "mongodb";

declare global {
  // Cached across hot reload (dev) and warm serverless invocations (Vercel).
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI environment variable. Set it to your MongoDB Atlas connection string."
    );
  }
  return uri;
}

function getDbName(): string {
  const dbName = process.env.MONGODB_DB;
  if (!dbName) {
    throw new Error(
      "Missing MONGODB_DB environment variable. Set it to your database name (e.g. damnart_crm)."
    );
  }
  return dbName;
}

function createClientPromise(): Promise<MongoClient> {
  const client = new MongoClient(getMongoUri(), {
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
  });
  return client.connect();
}

/**
 * Reuse one MongoClient promise per runtime isolate.
 * Required for Next.js on Vercel — do not create a new client per request.
 */
function getClientPromise(): Promise<MongoClient> {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = createClientPromise();
  }
  return global._mongoClientPromise;
}

let cachedDb: Db | null = null;

export async function getMongoClient(): Promise<MongoClient> {
  return getClientPromise();
}

export async function getDb(): Promise<Db> {
  if (cachedDb) {
    return cachedDb;
  }

  const client = await getMongoClient();
  cachedDb = client.db(getDbName());
  return cachedDb;
}
