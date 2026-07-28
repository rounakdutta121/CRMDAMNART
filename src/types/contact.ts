import type { ObjectId } from "mongodb";

export interface Contact {
  _id: ObjectId;
  name: string;
  email?: string;
  normalizedEmail?: string;
  phone?: string;
  normalizedPhone?: string;
  whatsapp?: string;
  company?: string;
  jobTitle?: string;
  country?: string;
  state?: string;
  city?: string;
  searchName?: string;
  searchCompany?: string;
  isMerged?: boolean;
  mergedIntoContactId?: ObjectId;
  mergedAt?: Date;
  mergedByUserId?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
