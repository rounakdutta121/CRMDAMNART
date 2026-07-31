import { config } from "dotenv";
import { ensureIndexes } from "../src/lib/indexes";
import { COLLECTIONS } from "../src/lib/constants";
import { getDb, getMongoClient } from "../src/lib/mongodb";

async function main() {
  config({ path: ".env", override: true });

  console.log("Auditing DamnArt CRM indexes…");
  console.log(
    `Database target: ${process.env.MONGODB_DB} (${(process.env.MONGODB_URI ?? "").startsWith("mongodb+srv") ? "Atlas" : "other"})`
  );
  await ensureIndexes();
  console.log("Indexes ensured.");

  const db = await getDb();
  const existing = new Set(
    (await db.listCollections().toArray()).map((entry) => entry.name)
  );
  const collections = Object.values(COLLECTIONS);
  for (const name of collections) {
    if (!existing.has(name)) {
      console.log(`- ${name}: (absent)`);
      continue;
    }
    const indexes = await db.collection(name).indexes();
    console.log(`- ${name}: ${indexes.length} index(es)`);
  }

  console.log("Index audit completed successfully.");
  const client = await getMongoClient();
  await client.close();
}

main().catch((error) => {
  console.error(
    "Failed to create indexes:",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
