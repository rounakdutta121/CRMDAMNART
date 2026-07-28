import type { ObjectId } from "mongodb";
import type { LeadPriority } from "@/types/lead";

export type FormFieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "number"
  | "date"
  | "datetime"
  | "url"
  | "select"
  | "multi_select"
  | "checkbox"
  | "boolean"
  | "hidden";

export type CanonicalFieldTarget =
  | "contact.name"
  | "contact.firstName"
  | "contact.lastName"
  | "contact.email"
  | "contact.phone"
  | "contact.whatsapp"
  | "contact.company"
  | "contact.jobTitle"
  | "contact.country"
  | "contact.state"
  | "contact.city"
  | "lead.service"
  | "lead.serviceCategory"
  | "lead.message"
  | "lead.leadValue"
  | "lead.currency"
  | "lead.priority"
  | "attribution.gclid"
  | "attribution.gbraid"
  | "attribution.wbraid"
  | "attribution.msclkid"
  | "attribution.fbclid"
  | "attribution.utmSource"
  | "attribution.utmMedium"
  | "attribution.utmCampaign"
  | "attribution.utmTerm"
  | "attribution.utmContent"
  | "attribution.sessionId"
  | "attribution.landingPage"
  | "attribution.formPage"
  | "attribution.pageUrl"
  | "attribution.referrer"
  | "attribution.submittedAt"
  | "custom"
  | "ignore";

export type UnknownFieldPolicy = "ignore" | "reject" | "record_field_names";

export type ContactIdentityRule =
  | "email_or_phone"
  | "email_required"
  | "phone_required"
  | "email_and_phone"
  | "none";

export interface FormFieldDefinition {
  id: string;
  incomingKey: string;
  aliases: string[];
  label: string;
  description?: string;
  fieldType: FormFieldType;
  canonicalTarget: CanonicalFieldTarget;
  required: boolean;
  active: boolean;
  order: number;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  options?: Array<{ label: string; value: string }>;
  validation?: {
    minimumLength?: number;
    maximumLength?: number;
    minimumValue?: number;
    maximumValue?: number;
    pattern?: string;
  };
  trimValue: boolean;
  normalizeValue: boolean;
  showOnLeadDetail: boolean;
  showOnLeadList: boolean;
  searchable: boolean;
  sensitive: boolean;
}

export interface WebsiteForm {
  _id: ObjectId;
  websiteId: ObjectId;
  name: string;
  code: string;
  description?: string;
  pageUrl?: string;
  defaultServiceId?: ObjectId;
  defaultLeadOwnerId?: ObjectId;
  fields: FormFieldDefinition[];
  schemaVersion: number;
  schemaMode: "legacy" | "dynamic";
  unknownFieldPolicy: UnknownFieldPolicy;
  contactIdentityRule: ContactIdentityRule;
  attributionEnabled: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type StoredFormValue = string | number | boolean | string[] | null;

export interface LeadFormFieldValue {
  fieldDefinitionId: string;
  incomingKey: string;
  label: string;
  fieldType: FormFieldType;
  canonicalTarget: CanonicalFieldTarget;
  value: StoredFormValue;
  order: number;
  showOnLeadDetail: boolean;
  sensitive: boolean;
}

export interface MappedFormSubmission {
  contactData: {
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    company?: string;
    jobTitle?: string;
    country?: string;
    state?: string;
    city?: string;
  };
  leadData: {
    service?: string;
    serviceCategory?: string;
    message?: string;
    leadValue?: number;
    currency?: string;
    priority?: LeadPriority;
  };
  attributionData: {
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
    sessionId?: string;
    landingPage?: string;
    formPage?: string;
    pageUrl?: string;
    referrer?: string;
    submittedAt?: Date;
  };
  customFieldValues: LeadFormFieldValue[];
  ignoredFieldNames: string[];
  unknownFieldNames: string[];
  schemaVersion: number;
}
