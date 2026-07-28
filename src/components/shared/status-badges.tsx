import { Badge } from "@/components/ui/badge";
import {
  FULFILMENT_STATUS_LABELS,
  LEAD_PRIORITY_LABELS,
  SALES_STATUS_LABELS,
  SOURCE_SYSTEM_LABELS,
} from "@/lib/constants";
import type {
  FulfilmentStatus,
  LeadPriority,
  SalesStatus,
  SourceSystem,
} from "@/types/lead";

const salesVariant: Record<
  SalesStatus,
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

export function SalesStatusBadge({ status }: { status: SalesStatus }) {
  return (
    <Badge variant={salesVariant[status]}>{SALES_STATUS_LABELS[status]}</Badge>
  );
}

export function FulfilmentStatusBadge({
  status,
}: {
  status: FulfilmentStatus;
}) {
  return (
    <Badge variant="outline">{FULFILMENT_STATUS_LABELS[status]}</Badge>
  );
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
