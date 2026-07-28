import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { withDynamicStatus } from "@/repositories/follow-ups.repository";
import type { FollowUp } from "@/types/follow-up";

function createFollowUp(overrides: Partial<FollowUp> = {}): FollowUp {
  const now = new Date();
  return {
    _id: new ObjectId(),
    leadId: new ObjectId(),
    contactId: new ObjectId(),
    websiteId: new ObjectId(),
    assignedUserId: new ObjectId(),
    method: "call",
    scheduledAt: now,
    status: "pending",
    createdByUserId: new ObjectId(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("withDynamicStatus", () => {
  it("marks pending follow-ups in the past as overdue", () => {
    const past = new Date(Date.now() - 60_000);
    const followUp = createFollowUp({ scheduledAt: past, status: "pending" });

    expect(withDynamicStatus(followUp).status).toBe("overdue");
  });

  it("keeps pending future follow-ups as pending", () => {
    const future = new Date(Date.now() + 60_000);
    const followUp = createFollowUp({ scheduledAt: future, status: "pending" });

    expect(withDynamicStatus(followUp).status).toBe("pending");
  });

  it("does not change completed follow-ups", () => {
    const past = new Date(Date.now() - 60_000);
    const followUp = createFollowUp({ scheduledAt: past, status: "completed" });

    expect(withDynamicStatus(followUp).status).toBe("completed");
  });
});
