import type { ObjectId } from "mongodb";

export interface CRMService {
  _id: ObjectId;
  name: string;
  code: string;
  category?: string;
  description?: string;
  websiteIds: ObjectId[];
  defaultLeadValue?: number;
  defaultCurrency: string;
  defaultLeadOwnerId?: ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
