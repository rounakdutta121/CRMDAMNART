import { ensureIndexes } from "../src/lib/indexes";
import { COLLECTIONS } from "../src/lib/constants";
import { getDb, getMongoClient } from "../src/lib/mongodb";

async function main() {
  console.log("Auditing DamnArt CRM indexes…");
  await ensureIndexes();
  console.log("Indexes ensured.");

  const db = await getDb();
  const collections = Object.values(COLLECTIONS);
  for (const name of collections) {
    const indexes = await db.collection(name).indexes();
    console.log(`- ${name}: ${indexes.length} index(es)`);
  }

  console.log("Index audit completed successfully.");
  const client = await getMongoClient();
  await client.close();
}

main().catch((error) => {
  console.error("Failed to create indexes:", error instanceof Error ? error.message : error);
  process.exit(1);
});
