import { Badge } from "@/components/ui/badge";
import {
  LEAD_PRIORITY_LABELS,
  LEAD_STATUS_LABELS,
  SOURCE_SYSTEM_LABELS,
} from "@/lib/constants";
import type { LeadPriority, LeadStatus, SourceSystem } from "@/types/lead";

const statusVariant: Record<
  LeadStatus,
  "secondary" | "info" | "success" | "warning" | "danger" | "default" | "active"
> = {
  new: "info",
  assigned: "secondary",
  contact_attempted: "secondary",
  contacted: "active",
  follow_up_required: "warning",
  qualified: "success",
  proposal_sent: "info",
  negotiation: "warning",
  confirmed: "success",
  payment_pending: "warning",
  converted: "success",
  lost: "danger",
  duplicate: "secondary",
  spam_invalid: "danger",
};

const priorityVariant: Record<
  LeadPriority,
  "secondary" | "info" | "warning" | "danger"
> = {
  low: "secondary",
  normal: "info",
  high: "warning",
  urgent: "danger",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge variant={statusVariant[status]}>{LEAD_STATUS_LABELS[status]}</Badge>
  );
}

/** @deprecated Use LeadStatusBadge */
export function SalesStatusBadge({ status }: { status: LeadStatus }) {
  return <LeadStatusBadge status={status} />;
}

export function PriorityBadge({ priority }: { priority: LeadPriority }) {
  return (
    <Badge variant={priorityVariant[priority]}>
      PRIORITY / {LEAD_PRIORITY_LABELS[priority]}
    </Badge>
  );
}

export function SourceBadge({ source }: { source: SourceSystem }) {
  return <Badge variant="secondary">{SOURCE_SYSTEM_LABELS[source]}</Badge>;
}
