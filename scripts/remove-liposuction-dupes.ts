import { config } from "dotenv";
import { ObjectId } from "mongodb";
import { COLLECTIONS } from "../src/lib/constants";
import {
  countLeadsForContact,
  deleteLeadById,
  deleteLeadRelatedRecords,
} from "../src/repositories/leads.repository";
import { deleteContactById } from "../src/repositories/contacts.repository";
import { getDb, getMongoClient } from "../src/lib/mongodb";

const DUPLICATE_LEAD_IDS = [
  "6a8ec29a21f82b3d7b3513aa", // DA-LEAD-2026-000158
  "6a8fbb784a5f1aebc3c141c8", // DA-LEAD-2026-000162
  "6a91e38631e5662b40bf6cff", // DA-LEAD-2026-000168
];

async function deleteLeadAndOrphanContact(leadId: string) {
  const db = await getDb();
  const lead = await db.collection(COLLECTIONS.leads).findOne({
    _id: new ObjectId(leadId),
  });

  if (!lead) {
    console.log(`Lead ${leadId} not found, skipping.`);
    return;
  }

  const contactId = lead.contactId.toHexString();
  await deleteLeadRelatedRecords(leadId);
  const deleted = await deleteLeadById(leadId);
  if (!deleted) {
    throw new Error(`Failed to delete lead ${leadId}`);
  }

  const remainingLeads = await countLeadsForContact(contactId);
  if (remainingLeads === 0) {
    await deleteContactById(contactId);
    console.log(
      `Deleted lead ${lead.leadNumber} (${leadId}) and orphan contact ${contactId}.`
    );
    return;
  }

  console.log(
    `Deleted lead ${lead.leadNumber} (${leadId}); contact ${contactId} kept (${remainingLeads} leads).`
  );
}

async function main() {
  config({ path: ".env", override: true });

  for (const leadId of DUPLICATE_LEAD_IDS) {
    await deleteLeadAndOrphanContact(leadId);
  }

  const client = await getMongoClient();
  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
