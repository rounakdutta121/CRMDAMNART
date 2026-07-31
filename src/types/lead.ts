import type { ObjectId } from "mongodb";
import type { LeadFormFieldValue } from "@/types/form";

/** Single pipeline status for a lead (replaces sales + fulfilment). */
export type LeadStatus =
  | "new"
  | "assigned"
  | "contact_attempted"
  | "contacted"
  | "follow_up_required"
  | "qualified"
  | "proposal_sent"
  | "negotiation"
  | "confirmed"
  | "payment_pending"
  | "converted"
  | "lost"
  | "duplicate"
  | "spam_invalid";

/** @deprecated Use LeadStatus */
export type SalesStatus = LeadStatus;

export type LeadPriority = "low" | "normal" | "high" | "urgent";

export type SourceSystem =
  | "website"
  | "n8n"
  | "apps_script"
  | "manual"
  | "import";

export type ConsentStatus = "granted" | "denied" | "unknown";

export interface Lead {
  _id: ObjectId;
  leadNumber: string;
  contactId: ObjectId;
  websiteId: ObjectId;
  formId?: ObjectId;
  formCode?: string;
  formName?: string;
  formSchemaVersion?: number;
  formFieldValues?: LeadFormFieldValue[];
  isTestLead?: boolean;
  externalSubmissionId?: string;
  sourceSystem: SourceSystem;
  serviceId?: ObjectId;
  service?: string;
  submittedServiceName?: string;
  message?: string;
  assignedUserId?: ObjectId;
  status: LeadStatus;
  priority: LeadPriority;
  currency: string;
  confirmedAt?: Date;
  paidAt?: Date;
  convertedAt?: Date;
  completedAt?: Date;
  consentStatus?: ConsentStatus;
  privacyPolicyVersion?: string;
  searchName?: string;
  searchCompany?: string;
  createdAt: Date;
  updatedAt: Date;
}
