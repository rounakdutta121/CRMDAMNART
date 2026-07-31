import { config } from "dotenv";
import { COLLECTIONS } from "../src/lib/constants";
import { getDb, getMongoClient } from "../src/lib/mongodb";

async function main() {
  // Prefer project .env over shell overrides (e.g. accidental localhost URI).
  config({ path: ".env", override: true });

  console.log("Simplifying CRM schema…");
  console.log(
    `Database target: ${process.env.MONGODB_DB} (${(process.env.MONGODB_URI ?? "").startsWith("mongodb+srv") ? "Atlas" : "other"})`
  );

  const db = await getDb();

  const renameResult = await db.collection(COLLECTIONS.leads).updateMany(
    { salesStatus: { $exists: true }, status: { $exists: false } },
    [{ $set: { status: "$salesStatus" } }, { $unset: "salesStatus" }]
  );
  console.log(
    `Leads renamed salesStatus→status: matched=${renameResult.matchedCount}, modified=${renameResult.modifiedCount}`
  );

  // Also unset salesStatus when status already exists
  const unsetSalesAlias = await db.collection(COLLECTIONS.leads).updateMany(
    { salesStatus: { $exists: true } },
    { $unset: { salesStatus: "" } }
  );
  console.log(
    `Leads unset leftover salesStatus: modified=${unsetSalesAlias.modifiedCount}`
  );

  const unsetLeadFields = await db.collection(COLLECTIONS.leads).updateMany(
    {},
    {
      $unset: {
        fulfilmentStatus: "",
        serviceCategory: "",
        leadValue: "",
        lostReason: "",
        nextFollowUpAt: "",
      },
    }
  );
  console.log(
    `Leads unset obsolete fields: modified=${unsetLeadFields.modifiedCount}`
  );

  const unsetContacts = await db.collection(COLLECTIONS.contacts).updateMany(
    {},
    { $unset: { jobTitle: "" } }
  );
  console.log(
    `Contacts unset jobTitle: modified=${unsetContacts.modifiedCount}`
  );

  const unsetServices = await db.collection(COLLECTIONS.services).updateMany(
    {},
    { $unset: { defaultLeadValue: "" } }
  );
  console.log(
    `Services unset defaultLeadValue: modified=${unsetServices.modifiedCount}`
  );

  try {
    await db.collection(COLLECTIONS.followUps).drop();
    console.log("Dropped followUps collection.");
  } catch (error) {
    console.log(
      `followUps collection not dropped: ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
  }

  console.log("Done.");
  const client = await getMongoClient();
  await client.close();
}

main().catch(async (error) => {
  console.error(error);
  try {
    const client = await getMongoClient();
    await client.close();
  } catch {
    // ignore
  }
  process.exit(1);
});
