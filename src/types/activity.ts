import type { ObjectId } from "mongodb";

export type LeadActivityType =
  | "lead_created"
  | "lead_updated"
  | "status_changed"
  | "fulfilment_status_changed"
  | "assignment_changed"
  | "note_added"
  | "follow_up_scheduled"
  | "follow_up_completed"
  | "follow_up_cancelled"
  | "call_logged"
  | "email_logged"
  | "whatsapp_logged"
  | "meeting_logged"
  | "contact_attempt"
  | "customer_confirmed"
  | "payment_recorded"
  | "service_completed";

export interface LeadActivity {
  _id: ObjectId;
  leadId: ObjectId;
  contactId: ObjectId;
  websiteId: ObjectId;
  type: LeadActivityType;
  description: string;
  metadata?: Record<string, unknown>;
  createdByUserId?: ObjectId;
  createdBySystem?: string;
  createdAt: Date;
}
