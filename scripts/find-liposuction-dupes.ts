import { config } from "dotenv";
import { COLLECTIONS } from "../src/lib/constants";
import { getDb, getMongoClient } from "../src/lib/mongodb";

async function main() {
  config({ path: ".env", override: true });
  const db = await getDb();

  const leads = await db
    .collection(COLLECTIONS.leads)
    .find({
      $or: [
        { formCode: /liposuction/i },
        { formName: /liposuction/i },
      ],
    })
    .sort({ createdAt: 1 })
    .toArray();

  console.log(`Found ${leads.length} liposuction-related leads\n`);

  for (const lead of leads) {
    const contact = await db.collection(COLLECTIONS.contacts).findOne({
      _id: lead.contactId,
    });
    const attr = await db.collection(COLLECTIONS.leadAttributions).findOne({
      leadId: lead._id,
    });

    console.log({
      id: lead._id.toHexString(),
      leadNumber: lead.leadNumber,
      formCode: lead.formCode,
      createdAt: lead.createdAt,
      contactId: lead.contactId.toHexString(),
      contactName: contact?.name,
      gclid: attr?.gclid ?? null,
    });
  }

  const client = await getMongoClient();
  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
