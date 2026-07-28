import type { ObjectId } from "mongodb";

export type TouchType = "first_touch" | "last_touch" | "submission";

export interface LeadAttribution {
  _id: ObjectId;
  leadId: ObjectId;
  contactId: ObjectId;
  websiteId: ObjectId;
  sessionId?: string;
  gclid?: string;
  gbraid?: string;
  wbraid?: string;
  msclkid?: string;
  fbclid?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  landingPage?: string;
  formPage?: string;
  pageUrl?: string;
  referrer?: string;
  deviceType?: string;
  browser?: string;
  touchType: TouchType;
  capturedAt: Date;
}
