import { getDb } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/constants";

export async function ensureIndexes(): Promise<void> {
  const db = await getDb();

  await db.collection(COLLECTIONS.users).createIndexes([
    { key: { normalizedEmail: 1 }, unique: true, name: "users_normalizedEmail_unique" },
    { key: { isActive: 1 }, name: "users_isActive" },
    { key: { role: 1 }, name: "users_role" },
  ]);

  await db.collection(COLLECTIONS.services).createIndexes([
    { key: { code: 1 }, unique: true, name: "services_code_unique" },
    { key: { websiteIds: 1 }, name: "services_websiteIds" },
    { key: { isActive: 1, name: 1 }, name: "services_isActive_name" },
  ]);

  await db.collection(COLLECTIONS.websiteForms).createIndexes([
    {
      key: { websiteId: 1, code: 1 },
      unique: true,
      name: "websiteForms_websiteId_code_unique",
    },
    { key: { websiteId: 1, isActive: 1 }, name: "websiteForms_websiteId_isActive" },
    {
      key: { websiteId: 1, schemaMode: 1 },
      name: "websiteForms_websiteId_schemaMode",
    },
  ]);

  await db.collection(COLLECTIONS.websites).createIndexes([
    { key: { code: 1 }, unique: true, name: "websites_code_unique" },
    { key: { webhookKey: 1 }, unique: true, name: "websites_webhookKey_unique" },
  ]);

  await db.collection(COLLECTIONS.contacts).createIndexes([
    { key: { normalizedEmail: 1 }, name: "contacts_normalizedEmail" },
    { key: { normalizedPhone: 1 }, name: "contacts_normalizedPhone" },
    { key: { createdAt: -1 }, name: "contacts_createdAt" },
    { key: { isMerged: 1 }, name: "contacts_isMerged" },
    { key: { searchName: 1 }, name: "contacts_searchName" },
  ]);

  // Clean up documents that stored explicit null (breaks sparse unique indexes).
  await db.collection(COLLECTIONS.leads).updateMany(
    { externalSubmissionId: null },
    { $unset: { externalSubmissionId: "" } }
  );

  try {
    await db
      .collection(COLLECTIONS.leads)
      .dropIndex("leads_websiteId_externalSubmissionId_unique_sparse");
  } catch {
    // Index may already be absent on fresh databases.
  }

  await db.collection(COLLECTIONS.leads).createIndexes([
    { key: { leadNumber: 1 }, unique: true, name: "leads_leadNumber_unique" },
    { key: { websiteId: 1, createdAt: -1 }, name: "leads_websiteId_createdAt" },
    { key: { websiteId: 1, salesStatus: 1 }, name: "leads_websiteId_salesStatus" },
    {
      key: { websiteId: 1, fulfilmentStatus: 1 },
      name: "leads_websiteId_fulfilmentStatus",
    },
    {
      key: { assignedUserId: 1, createdAt: -1 },
      name: "leads_assignedUserId_createdAt",
    },
    { key: { contactId: 1, createdAt: -1 }, name: "leads_contactId_createdAt" },
    { key: { nextFollowUpAt: 1 }, name: "leads_nextFollowUpAt" },
    {
      key: { isTestLead: 1, createdAt: -1 },
      name: "leads_isTestLead_createdAt",
    },
    {
      key: { websiteId: 1, externalSubmissionId: 1 },
      unique: true,
      // Sparse treats explicit null as indexed; only real string IDs must be unique.
      partialFilterExpression: {
        externalSubmissionId: { $type: "string" },
      },
      name: "leads_websiteId_externalSubmissionId_unique_partial",
    },
    {
      key: { websiteId: 1, formId: 1, createdAt: -1 },
      name: "leads_websiteId_formId_createdAt",
    },
    { key: { formId: 1, createdAt: -1 }, name: "leads_formId_createdAt" },
    { key: { serviceId: 1, createdAt: -1 }, name: "leads_serviceId_createdAt" },
    {
      key: { assignedUserId: 1, salesStatus: 1 },
      name: "leads_assignedUserId_salesStatus",
    },
  ]);

  await db.collection(COLLECTIONS.leadAttributions).createIndexes([
    { key: { leadId: 1 }, name: "attributions_leadId" },
    { key: { contactId: 1 }, name: "attributions_contactId" },
    {
      key: { websiteId: 1, capturedAt: -1 },
      name: "attributions_websiteId_capturedAt",
    },
    { key: { gclid: 1 }, sparse: true, name: "attributions_gclid_sparse" },
    { key: { gbraid: 1 }, sparse: true, name: "attributions_gbraid_sparse" },
    { key: { wbraid: 1 }, sparse: true, name: "attributions_wbraid_sparse" },
  ]);

  await db.collection(COLLECTIONS.leadActivities).createIndexes([
    { key: { leadId: 1, createdAt: -1 }, name: "activities_leadId_createdAt" },
    {
      key: { websiteId: 1, createdAt: -1 },
      name: "activities_websiteId_createdAt",
    },
  ]);

  await db.collection(COLLECTIONS.integrationLogs).createIndexes([
    {
      key: { websiteId: 1, createdAt: -1 },
      name: "integrationLogs_websiteId_createdAt",
    },
    { key: { formId: 1, createdAt: -1 }, name: "integrationLogs_formId_createdAt" },
    { key: { status: 1, createdAt: -1 }, name: "integrationLogs_status_createdAt" },
    { key: { idempotencyKey: 1 }, sparse: true, name: "integrationLogs_idempotencyKey_sparse" },
    {
      key: { externalSubmissionId: 1 },
      sparse: true,
      name: "integrationLogs_externalSubmissionId_sparse",
    },
  ]);

  await db.collection(COLLECTIONS.savedLeadViews).createIndexes([
    { key: { userId: 1, name: 1 }, name: "savedLeadViews_userId_name" },
    { key: { userId: 1, isDefault: 1 }, name: "savedLeadViews_userId_isDefault" },
  ]);

  await db.collection(COLLECTIONS.leadAssignmentHistory).createIndexes([
    {
      key: { leadId: 1, createdAt: -1 },
      name: "leadAssignmentHistory_leadId_createdAt",
    },
  ]);

  await db.collection(COLLECTIONS.followUps).createIndexes([
    {
      key: { assignedUserId: 1, scheduledAt: 1 },
      name: "followUps_assignedUserId_scheduledAt",
    },
    { key: { leadId: 1, scheduledAt: 1 }, name: "followUps_leadId_scheduledAt" },
    { key: { status: 1, scheduledAt: 1 }, name: "followUps_status_scheduledAt" },
  ]);

  await db.collection(COLLECTIONS.conversionEvents).createIndexes([
    {
      key: { transactionId: 1 },
      unique: true,
      name: "conversionEvents_transactionId_unique",
    },
    { key: { status: 1, createdAt: -1 }, name: "conversionEvents_status_createdAt" },
    {
      key: { leadId: 1, eventType: 1 },
      name: "conversionEvents_leadId_eventType",
    },
  ]);

  await db.collection(COLLECTIONS.webhookIdempotency).createIndexes([
    {
      key: { websiteId: 1, idempotencyKey: 1 },
      unique: true,
      name: "idempotency_websiteId_key_unique",
    },
  ]);

  await db.collection(COLLECTIONS.auditLogs).createIndexes([
    { key: { createdAt: -1 }, name: "auditLogs_createdAt" },
    { key: { entityType: 1, entityId: 1 }, name: "auditLogs_entity" },
  ]);

  await db.collection(COLLECTIONS.userInvitations).createIndexes([
    { key: { tokenHash: 1 }, unique: true, name: "invitations_tokenHash_unique" },
    { key: { normalizedEmail: 1, status: 1 }, name: "invitations_email_status" },
    { key: { status: 1, expiresAt: 1 }, name: "invitations_status_expiresAt" },
    { key: { invitedByUserId: 1, createdAt: -1 }, name: "invitations_invitedBy_createdAt" },
  ]);

  await db.collection(COLLECTIONS.notifications).createIndexes([
    { key: { userId: 1, createdAt: -1 }, name: "notifications_userId_createdAt" },
    { key: { userId: 1, isRead: 1 }, name: "notifications_userId_isRead" },
  ]);

  await db.collection(COLLECTIONS.dashboardShares).createIndexes([
    { key: { shareSlug: 1 }, unique: true, name: "dashboardShares_shareSlug_unique" },
    { key: { websiteId: 1, createdAt: -1 }, name: "dashboardShares_websiteId_createdAt" },
    { key: { status: 1 }, name: "dashboardShares_status" },
  ]);

  await db.collection(COLLECTIONS.dashboardShareAccessLogs).createIndexes([
    {
      key: { dashboardShareId: 1, viewedAt: -1 },
      name: "dashboardShareAccessLogs_share_viewedAt",
    },
    { key: { websiteId: 1, viewedAt: -1 }, name: "dashboardShareAccessLogs_website_viewedAt" },
  ]);

  await db.collection(COLLECTIONS.dashboardSharePasswordAttempts).createIndexes([
    { key: { key: 1 }, unique: true, name: "dashboardSharePasswordAttempts_key_unique" },
  ]);

  await db.collection(COLLECTIONS.loginAttempts).createIndexes([
    {
      key: { identifierHash: 1 },
      unique: true,
      name: "loginAttempts_identifierHash_unique",
    },
    {
      key: { lastFailureAt: 1 },
      expireAfterSeconds: 60 * 60 * 24,
      name: "loginAttempts_lastFailureAt_ttl",
    },
  ]);

  await db.collection(COLLECTIONS.rateLimitRecords).createIndexes([
    {
      key: { keyHash: 1, scope: 1 },
      unique: true,
      name: "rateLimitRecords_keyHash_scope_unique",
    },
    {
      key: { expiresAt: 1 },
      expireAfterSeconds: 0,
      name: "rateLimitRecords_expiresAt_ttl",
    },
  ]);
}
