import { COLLECTIONS } from "../src/lib/constants";
import { assertProductionSafeSeedPassword } from "../src/lib/env";
import { ensureIndexes } from "../src/lib/indexes";
import { getDb, getMongoClient } from "../src/lib/mongodb";
import { ensureAdminUser } from "../src/services/auth.service";
import { createWebsiteForUser } from "../src/services/websites.service";
import { findWebsiteByCode } from "../src/repositories/websites.repository";
import type { SessionUser } from "../src/types/auth";

async function main() {
  console.log("Seeding DamnArt CRM…");

  await ensureIndexes();
  console.log("Indexes ensured.");

  const db = await getDb();
  const sessionVersionMigration = await db
    .collection(COLLECTIONS.users)
    .updateMany(
      { sessionVersion: { $exists: false } },
      { $set: { sessionVersion: 1 } }
    );
  if (sessionVersionMigration.modifiedCount > 0) {
    console.log(
      `Migrated ${sessionVersionMigration.modifiedCount} user(s) to sessionVersion: 1.`
    );
  }

  const roleDefaults = [
  { role: "super_admin", canReceive: true, canViewUnassigned: true },
  { role: "admin", canReceive: true, canViewUnassigned: true },
  { role: "sales_manager", canReceive: true, canViewUnassigned: true },
  { role: "sales_executive", canReceive: true, canViewUnassigned: false },
  { role: "operations", canReceive: false, canViewUnassigned: false },
  { role: "marketing", canReceive: false, canViewUnassigned: false },
  { role: "viewer", canReceive: false, canViewUnassigned: false },
] as const;

  for (const defaults of roleDefaults) {
    const result = await db.collection(COLLECTIONS.users).updateMany(
      {
        role: defaults.role,
        canReceiveLeadAssignments: { $exists: false },
      },
      {
        $set: {
          canReceiveLeadAssignments: defaults.canReceive,
          canViewUnassignedLeads: defaults.canViewUnassigned,
        },
      }
    );
    if (result.modifiedCount > 0) {
      console.log(
        `Migrated ${result.modifiedCount} ${defaults.role} user(s) with assignment defaults.`
      );
    }
  }

  const missingViewFlag = await db.collection(COLLECTIONS.users).updateMany(
    {
      canViewUnassignedLeads: { $exists: false },
      canReceiveLeadAssignments: { $exists: true },
    },
    { $set: { canViewUnassignedLeads: false } }
  );
  if (missingViewFlag.modifiedCount > 0) {
    console.log(
      `Migrated ${missingViewFlag.modifiedCount} user(s) with canViewUnassignedLeads default.`
    );
  }

  const name =
    process.env.SEED_ADMIN_NAME ?? "DamnArt CRM Administrator";
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@damnart.com";
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password) {
    throw new Error("SEED_ADMIN_PASSWORD is required.");
  }

  assertProductionSafeSeedPassword(password);

  const { created, user } = await ensureAdminUser({ name, email, password });
  console.log(
    created
      ? `Administrator created: ${user.email}`
      : `Administrator already exists: ${user.email}`
  );

  if (process.env.NODE_ENV !== "production" && process.env.ALLOW_DEMO_SEED === "true") {
    const existingDemo = await findWebsiteByCode("damnart-main");
    if (!existingDemo) {
      const seedUser: SessionUser = {
        id: user._id.toHexString(),
        name: user.name,
        email: user.email,
        role: user.role,
        sessionVersion: user.sessionVersion ?? 1,
        permittedWebsiteIds: user.permittedWebsiteIds.map((id) =>
          id.toHexString()
        ),
        canReceiveLeadAssignments:
          user.canReceiveLeadAssignments ?? true,
        canViewUnassignedLeads: user.canViewUnassignedLeads ?? true,
      };

      await createWebsiteForUser(seedUser, {
        name: "DamnArt Main Website",
        code: "damnart-main",
        primaryDomain: "damnart.com",
        additionalDomains: [],
        brandName: "DamnArt",
        businessDivision: "Digital Marketing",
        defaultCurrency: "INR",
        timezone: "Asia/Kolkata",
        isActive: true,
      });
      console.log("Demonstration website created: damnart-main");
      console.log("API key was generated — retrieve it from the CRM after login if needed by regenerating.");
    } else {
      console.log("Demonstration website already exists: damnart-main");
    }
  }

  console.log("Seed completed successfully.");
  const client = await getMongoClient();
  await client.close();
}

main().catch((error) => {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
