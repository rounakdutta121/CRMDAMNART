import { ObjectId } from "mongodb";
import {
  createSavedView,
  deleteSavedView,
  findSavedViewById,
  listSavedViewsByUser,
  updateSavedView,
} from "@/repositories/saved-views.repository";
import type { SaveLeadViewInput } from "@/lib/validation/saved-view.schema";
import type { SessionUser } from "@/types/auth";
import type { SavedLeadView } from "@/types/saved-view";

export async function getSavedViewsForUser(
  user: SessionUser
): Promise<SavedLeadView[]> {
  return listSavedViewsByUser(user.id);
}

export async function saveLeadViewForUser(
  user: SessionUser,
  input: SaveLeadViewInput
): Promise<SavedLeadView> {
  const now = new Date();
  return createSavedView({
    userId: new ObjectId(user.id),
    name: input.name,
    filters: input.filters,
    visibleColumns: input.visibleColumns,
    isDefault: input.isDefault ?? false,
    viewMode: input.viewMode,
    selectedYear: input.selectedYear,
    selectedMonth: input.selectedMonth,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateLeadViewForUser(
  user: SessionUser,
  viewId: string,
  input: SaveLeadViewInput
): Promise<SavedLeadView> {
  const existing = await findSavedViewById(viewId, user.id);
  if (!existing) {
    throw new Error("Saved view not found.");
  }

  await updateSavedView(viewId, user.id, {
    name: input.name,
    filters: input.filters,
    visibleColumns: input.visibleColumns,
    isDefault: input.isDefault,
    viewMode: input.viewMode,
    selectedYear: input.selectedYear,
    selectedMonth: input.selectedMonth,
  });

  const updated = await findSavedViewById(viewId, user.id);
  if (!updated) {
    throw new Error("Saved view not found after update.");
  }
  return updated;
}

export async function deleteLeadViewForUser(
  user: SessionUser,
  viewId: string
): Promise<void> {
  await deleteSavedView(viewId, user.id);
}

export async function setDefaultLeadViewForUser(
  user: SessionUser,
  viewId: string
): Promise<void> {
  await updateSavedView(viewId, user.id, { isDefault: true });
}
