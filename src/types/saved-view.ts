import type { ObjectId } from "mongodb";

export type LeadViewMode = "table" | "monthly" | "kanban";

export interface SavedLeadView {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  filters: Record<string, string | string[] | boolean>;
  visibleColumns?: string[];
  viewMode?: LeadViewMode;
  selectedYear?: number;
  selectedMonth?: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
