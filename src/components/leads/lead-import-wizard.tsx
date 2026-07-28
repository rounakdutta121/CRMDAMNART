"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { importLeadsAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseCsv } from "@/lib/csv";
import { IMPORT_CANONICAL_FIELDS } from "@/lib/validation/import.schema";
import {
  LEAD_PRIORITIES,
  LEAD_PRIORITY_LABELS,
  SALES_STATUSES,
  SALES_STATUS_LABELS,
} from "@/lib/constants";

export interface ImportWebsiteOption {
  id: string;
  name: string;
}

type Step = "upload" | "map" | "preview" | "done";

export function LeadImportWizard({
  websites,
}: {
  websites: ImportWebsiteOption[];
}) {
  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [websiteId, setWebsiteId] = useState(websites[0]?.id ?? "");
  const [pending, startTransition] = useTransition();

  const rowObjects = useMemo(
    () =>
      rows.map((row) =>
        Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]))
      ),
    [headers, rows]
  );

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = parseCsv(text);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setMappings({});
      setStep("map");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to parse CSV.");
    }
  }

  function handleImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await importLeadsAction(undefined, formData);
      if (result.success) {
        toast.success(result.message ?? "Import completed.");
        setStep("done");
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-6 border border-[var(--border)] bg-[var(--surface-elevated)] p-6">
      <ol className="flex flex-wrap gap-2 text-sm">
        {(["upload", "map", "preview", "done"] as Step[]).map((item) => (
          <li
            key={item}
            className={
              step === item
                ? "rounded-full bg-[var(--accent)] px-3 py-1 text-[var(--accent-fg)]"
                : "rounded-full bg-[var(--surface-muted)] px-3 py-1 text-[var(--ink-muted)]"
            }
          >
            {item}
          </li>
        ))}
      </ol>

      {step === "upload" ? (
        <div className="space-y-3">
          <Label htmlFor="csv-file">Upload CSV</Label>
          <Input id="csv-file" type="file" accept=".csv,text/csv" onChange={onFileChange} />
          <p className="text-sm text-[var(--ink-muted)]">
            Maximum 2,000 rows. Include a header row with column names.
          </p>
        </div>
      ) : null}

      {step === "map" ? (
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="websiteId">Website</Label>
            <select
              id="websiteId"
              value={websiteId}
              onChange={(event) => setWebsiteId(event.target.value)}
              className="h-10 w-full max-w-md rounded-md border border-[var(--border)] px-3 text-sm"
            >
              {websites.map((website) => (
                <option key={website.id} value={website.id}>
                  {website.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {headers.map((header) => (
              <div key={header} className="space-y-1">
                <Label>{header}</Label>
                <select
                  value={mappings[header] ?? "skip"}
                  onChange={(event) =>
                    setMappings((prev) => ({
                      ...prev,
                      [header]: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                >
                  <option value="skip">Skip</option>
                  {IMPORT_CANONICAL_FIELDS.map((field) => (
                    <option key={field} value={field}>
                      {field}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <Button type="button" onClick={() => setStep("preview")}>
            Preview import
          </Button>
        </div>
      ) : null}

      {step === "preview" ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--ink-muted)]">
            {rowObjects.length} row(s) ready to import into{" "}
            {websites.find((website) => website.id === websiteId)?.name}.
          </p>

          <div className="overflow-x-auto rounded-md border border-[var(--border)]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--surface)]">
                <tr>
                  {Object.values(mappings)
                    .filter((value) => value !== "skip")
                    .map((field) => (
                      <th key={field} className="px-3 py-2">
                        {field}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {rowObjects.slice(0, 5).map((row, index) => (
                  <tr key={index} className="border-t border-[var(--border)]">
                    {Object.entries(mappings)
                      .filter(([, value]) => value !== "skip")
                      .map(([csvColumn, field]) => (
                        <td key={field} className="px-3 py-2">
                          {row[csvColumn] ?? "—"}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form onSubmit={handleImport} className="flex flex-wrap gap-3">
            <input type="hidden" name="websiteId" value={websiteId} />
            <input type="hidden" name="mappings" value={JSON.stringify(mappings)} />
            <input type="hidden" name="rows" value={JSON.stringify(rowObjects)} />
            <select
              name="defaultSalesStatus"
              defaultValue="new"
              className="h-10 rounded-md border border-[var(--border)] px-3 text-sm"
            >
              {SALES_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {SALES_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <select
              name="defaultPriority"
              defaultValue="normal"
              className="h-10 rounded-md border border-[var(--border)] px-3 text-sm"
            >
              {LEAD_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {LEAD_PRIORITY_LABELS[priority]}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={pending}>
              {pending ? "Importing…" : "Import leads"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setStep("map")}>
              Back
            </Button>
          </form>
        </div>
      ) : null}

      {step === "done" ? (
        <div className="space-y-3">
          <p className="text-sm text-[var(--ink)]">Import finished.</p>
          <Button type="button" onClick={() => setStep("upload")}>
            Import another file
          </Button>
        </div>
      ) : null}
    </div>
  );
}
