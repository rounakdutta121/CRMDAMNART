import { getDb } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/constants";

interface CounterDoc {
  _id: string;
  seq: number;
}

export async function generateLeadNumber(year?: number): Promise<string> {
  const db = await getDb();
  const currentYear = year ?? new Date().getFullYear();
  const counterId = `lead_${currentYear}`;

  const result = await db
    .collection<CounterDoc>(COLLECTIONS.counters)
    .findOneAndUpdate(
      { _id: counterId },
      { $inc: { seq: 1 } },
      {
        upsert: true,
        returnDocument: "after",
      }
    );

  const seq = result?.seq ?? 1;
  return formatLeadNumber(currentYear, seq);
}

export function formatLeadNumber(year: number, seq: number): string {
  const padded = String(seq).padStart(6, "0");
  return `DA-LEAD-${year}-${padded}`;
}
