import type { ObjectId } from "mongodb";
import type { LeadFormFieldValue } from "@/types/form";

export type SalesStatus =
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

export type FulfilmentStatus =
  | "not_started"
  | "onboarding"
  | "in_progress"
  | "completed"
  | "deliverables_sent"
  | "cancelled"
  | "refunded";

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
  serviceCategory?: string;
  message?: string;
  assignedUserId?: ObjectId;
  salesStatus: SalesStatus;
  fulfilmentStatus: FulfilmentStatus;
  priority: LeadPriority;
  leadValue?: number;
  currency: string;
  nextFollowUpAt?: Date;
  confirmedAt?: Date;
  paidAt?: Date;
  convertedAt?: Date;
  completedAt?: Date;
  lostReason?: string;
  consentStatus?: ConsentStatus;
  privacyPolicyVersion?: string;
  searchName?: string;
  searchCompany?: string;
  createdAt: Date;
  updatedAt: Date;
}
