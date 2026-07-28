import type { ObjectId } from "mongodb";

export type ConversionEventType =
  | "qualified"
  | "confirmed"
  | "payment_received"
  | "converted"
  | "completed";

export type ConversionUploadStatus =
  | "not_eligible"
  | "waiting"
  | "submitted"
  | "successful"
  | "failed"
  | "cancelled";

export interface ConversionEvent {
  _id: ObjectId;
  leadId: ObjectId;
  contactId: ObjectId;
  websiteId: ObjectId;
  eventType: ConversionEventType;
  googleAdsCustomerId?: string;
  conversionActionId?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  conversionValue?: number;
  currency?: string;
  transactionId: string;
  status: ConversionUploadStatus;
  attemptCount: number;
  lastAttemptAt?: Date;
  externalRequestId?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}
