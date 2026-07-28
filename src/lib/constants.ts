import type { UserRole } from "@/types/auth";
import type {
  FulfilmentStatus,
  LeadPriority,
  SalesStatus,
  SourceSystem,
} from "@/types/lead";
import type { FollowUpMethod, FollowUpStatus } from "@/types/follow-up";

export const COLLECTIONS = {
  users: "users",
  websites: "websites",
  contacts: "contacts",
  leads: "leads",
  leadAttributions: "leadAttributions",
  leadActivities: "leadActivities",
  followUps: "followUps",
  auditLogs: "auditLogs",
  conversionEvents: "conversionEvents",
  counters: "counters",
  webhookIdempotency: "webhookIdempotency",
  services: "services",
  websiteForms: "websiteForms",
  integrationLogs: "integrationLogs",
  savedLeadViews: "savedLeadViews",
  leadAssignmentHistory: "leadAssignmentHistory",
  userInvitations: "userInvitations",
  notifications: "notifications",
  dashboardShares: "dashboardShares",
  dashboardShareAccessLogs: "dashboardShareAccessLogs",
  dashboardSharePasswordAttempts: "dashboardSharePasswordAttempts",
  loginAttempts: "loginAttempts",
  rateLimitRecords: "rateLimitRecords",
} as const;

export const INVITATION_EXPIRY_HOURS = [24, 72, 168, 336] as const;

export const INVITATION_EXPIRY_LABELS: Record<
  (typeof INVITATION_EXPIRY_HOURS)[number],
  string
> = {
  24: "24 hours",
  72: "3 days",
  168: "7 days",
  336: "14 days",
};

export const ASSIGNMENT_REASONS = [
  "New lead distribution",
  "Website responsibility",
  "Workload balancing",
  "User unavailable",
  "Team change",
  "Manual reassignment",
  "Bulk reassignment",
  "Other",
] as const;

export type AssignmentReason = (typeof ASSIGNMENT_REASONS)[number];

export const DASHBOARD_PERIOD_PRESETS = [
  "last_7_days",
  "previous_7_days",
  "this_month",
  "last_month",
  "last_30_days",
  "last_90_days",
  "this_year",
  "last_year",
  "rolling_12_months",
  "custom",
  "all_time",
] as const;

export const DASHBOARD_PERIOD_LABELS: Record<
  (typeof DASHBOARD_PERIOD_PRESETS)[number],
  string
> = {
  last_7_days: "Last 7 days",
  previous_7_days: "Previous 7 days",
  this_month: "This month",
  last_month: "Last month",
  last_30_days: "Last 30 days",
  last_90_days: "Last 90 days",
  this_year: "This year",
  last_year: "Last year",
  rolling_12_months: "Rolling last 12 months",
  custom: "Custom range",
  all_time: "All time",
};

export const USER_ROLES: UserRole[] = [
  "super_admin",
  "admin",
  "sales_manager",
  "sales_executive",
  "operations",
  "marketing",
  "viewer",
];

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Administrator",
  admin: "Administrator",
  sales_manager: "Sales Manager",
  sales_executive: "Sales Executive",
  operations: "Operations",
  marketing: "Marketing",
  viewer: "Viewer",
};

export const SALES_STATUSES: SalesStatus[] = [
  "new",
  "assigned",
  "contact_attempted",
  "contacted",
  "follow_up_required",
  "qualified",
  "proposal_sent",
  "negotiation",
  "confirmed",
  "payment_pending",
  "converted",
  "lost",
  "duplicate",
  "spam_invalid",
];

export const SALES_STATUS_LABELS: Record<SalesStatus, string> = {
  new: "New",
  assigned: "Assigned",
  contact_attempted: "Contact Attempted",
  contacted: "Contacted",
  follow_up_required: "Follow-up Required",
  qualified: "Qualified",
  proposal_sent: "Proposal Sent",
  negotiation: "Negotiation",
  confirmed: "Confirmed",
  payment_pending: "Payment Pending",
  converted: "Converted",
  lost: "Lost",
  duplicate: "Duplicate",
  spam_invalid: "Spam / Invalid",
};

export const FULFILMENT_STATUSES: FulfilmentStatus[] = [
  "not_started",
  "onboarding",
  "in_progress",
  "completed",
  "deliverables_sent",
  "cancelled",
  "refunded",
];

export const FULFILMENT_STATUS_LABELS: Record<FulfilmentStatus, string> = {
  not_started: "Not Started",
  onboarding: "Onboarding",
  in_progress: "In Progress",
  completed: "Completed",
  deliverables_sent: "Deliverables Sent",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const LEAD_PRIORITIES: LeadPriority[] = [
  "low",
  "normal",
  "high",
  "urgent",
];

export const LEAD_PRIORITY_LABELS: Record<LeadPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const SOURCE_SYSTEMS: SourceSystem[] = [
  "website",
  "n8n",
  "apps_script",
  "manual",
  "import",
];

export const SOURCE_SYSTEM_LABELS: Record<SourceSystem, string> = {
  website: "Website",
  n8n: "n8n",
  apps_script: "Google Apps Script",
  manual: "Manual",
  import: "Import",
};

export const FOLLOW_UP_METHODS: FollowUpMethod[] = [
  "call",
  "email",
  "whatsapp",
  "meeting",
  "other",
];

export const FOLLOW_UP_METHOD_LABELS: Record<FollowUpMethod, string> = {
  call: "Call",
  email: "Email",
  whatsapp: "WhatsApp",
  meeting: "Meeting",
  other: "Other",
};

export const FOLLOW_UP_STATUSES: FollowUpStatus[] = [
  "pending",
  "completed",
  "cancelled",
  "overdue",
];

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
export const MAX_WEBHOOK_BODY_BYTES = 100_000;
export const MAX_FIELDS_PER_FORM = 60;
export const MAX_ALIASES_PER_FIELD = 10;
export const MAX_SELECT_OPTIONS = 100;
export const MAX_INCOMING_KEY_LENGTH = 100;
export const MAX_LABEL_LENGTH = 150;
export const MAX_TEXT_VALUE_LENGTH = 2_000;
export const MAX_TEXTAREA_VALUE_LENGTH = 10_000;
export const MAX_BULK_ACTION_SIZE = 100;
export const MAX_CSV_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_CSV_ROWS = 2_000;
export const MAX_EXPORT_ROWS = 10_000;
export const MAX_DYNAMIC_LIST_COLUMNS = 5;

export const APP_NAME = "DamnArt CRM";
