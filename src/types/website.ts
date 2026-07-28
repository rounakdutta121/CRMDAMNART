import type { ObjectId } from "mongodb";

export interface Website {
  _id: ObjectId;
  name: string;
  code: string;
  primaryDomain: string;
  additionalDomains: string[];
  brandName?: string;
  businessDivision?: string;
  defaultCurrency: string;
  timezone: string;
  defaultLeadOwnerId?: ObjectId;
  webhookKey: string;
  apiKeyHash: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type SafeWebsite = Omit<Website, "apiKeyHash">;
