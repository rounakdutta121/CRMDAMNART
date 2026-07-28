import type { ObjectId } from "mongodb";

export type DashboardPeriodPreset =
  | "last_7_days"
  | "previous_7_days"
  | "this_month"
  | "last_month"
  | "last_30_days"
  | "last_90_days"
  | "this_year"
  | "last_year"
  | "rolling_12_months"
  | "custom"
  | "all_time";

export type DashboardShareStatus = "active" | "expired" | "revoked";

export type DashboardAccessStatus =
  | "successful"
  | "password_failed"
  | "expired"
  | "revoked"
  | "not_found";

export interface DashboardShareBranding {
  logoUrl?: string;
  displayName: string;
  primaryColor?: string;
  accentColor?: string;
  footerText?: string;
  showDamnArtBranding: boolean;
}

export interface DashboardShareAccess {
  passwordProtected: boolean;
  passwordHash?: string;
  expiresAt?: Date;
  allowCsvDownload: boolean;
}

export interface DashboardShare {
  _id: ObjectId;
  websiteId: ObjectId;
  name: string;
  title: string;
  shareSlug: string;
  status: DashboardShareStatus;
  periodPreset: DashboardPeriodPreset;
  customStartDate?: Date;
  customEndDate?: Date;
  visibleMetrics: string[];
  visibleCharts: string[];
  visibleTables: string[];
  branding: DashboardShareBranding;
  access: DashboardShareAccess;
  createdByUserId: ObjectId;
  lastViewedAt?: Date;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type SafeDashboardShare = Omit<DashboardShare, "access"> & {
  access: Omit<DashboardShareAccess, "passwordHash">;
};

export interface DashboardShareAccessLog {
  _id: ObjectId;
  dashboardShareId?: ObjectId;
  websiteId?: ObjectId;
  status: DashboardAccessStatus;
  userAgentSummary?: string;
  countryCode?: string;
  viewedAt: Date;
}
