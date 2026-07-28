"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { updateFormAction, type ActionResult } from "@/app/actions";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createFieldDefinition } from "@/lib/form-schema";
import type {
  CanonicalFieldTarget,
  ContactIdentityRule,
  FormFieldDefinition,
  FormFieldType,
  UnknownFieldPolicy,
} from "@/types/form";

const initial: ActionResult = { success: false, message: "" };

const FIELD_TYPES: FormFieldType[] = [
  "text",
  "textarea",
  "email",
  "phone",
  "number",
  "date",
  "datetime",
  "url",
  "select",
  "multi_select",
  "checkbox",
  "boolean",
  "hidden",
];

const CANONICAL_TARGETS: CanonicalFieldTarget[] = [
  "contact.name",
  "contact.firstName",
  "contact.lastName",
  "contact.email",
  "contact.phone",
  "contact.whatsapp",
  "contact.company",
  "contact.jobTitle",
  "contact.country",
  "contact.state",
  "contact.city",
  "lead.service",
  "lead.serviceCategory",
  "lead.message",
  "lead.leadValue",
  "lead.currency",
  "lead.priority",
  "attribution.gclid",
  "attribution.utmSource",
  "attribution.utmMedium",
  "attribution.utmCampaign",
  "attribution.landingPage",
  "attribution.formPage",
  "attribution.referrer",
  "custom",
  "ignore",
];

export interface EditFormBuilderData {
  id: string;
  websiteId: string;
  websiteName: string;
  name: string;
  description?: string;
  pageUrl?: string;
  fields: FormFieldDefinition[];
  unknownFieldPolicy: UnknownFieldPolicy;
  contactIdentityRule: ContactIdentityRule;
  attributionEnabled: boolean;
  isActive: boolean;
}

function sortFields(fields: FormFieldDefinition[]): FormFieldDefinition[] {
  return [...fields].sort((a, b) => a.order - b.order);
}

export function EditFormBuilder({ form }: { form: EditFormBuilderData }) {
  const [fields, setFields] = useState<FormFieldDefinition[]>(
    sortFields(form.fields)
  );
  const fieldsJson = useMemo(() => JSON.stringify(fields), [fields]);
  const action = updateFormAction.bind(null, form.websiteId, form.id);
  const [state, formAction, pending] = useActionState(action, initial);

  function updateField(index: number, patch: Partial<FormFieldDefinition>) {
    setFields((current) =>
      current.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field
      )
    );
  }

  function moveField(index: number, direction: -1 | 1) {
    setFields((current) => {
      const next = [...current];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) {
        return current;
      }
      const temp = next[index]!;
      next[index] = next[targetIndex]!;
      next[targetIndex] = temp;
      return next.map((field, fieldIndex) => ({
        ...field,
        order: fieldIndex + 1,
      }));
    });
  }

  function removeField(index: number) {
    setFields((current) =>
      current
        .filter((_, fieldIndex) => fieldIndex !== index)
        .map((field, fieldIndex) => ({ ...field, order: fieldIndex + 1 }))
    );
  }

  function addField() {
    setFields((current) => [
      ...current,
      createFieldDefinition({
        incomingKey: `field_${current.length + 1}`,
        label: `Field ${current.length + 1}`,
        canonicalTarget: "custom",
        order: current.length + 1,
      }),
    ]);
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Websites", href: "/websites" },
          { label: form.websiteName, href: `/websites/${form.websiteId}` },
          { label: "Forms", href: `/websites/${form.websiteId}/forms` },
          {
            label: form.name,
            href: `/websites/${form.websiteId}/forms/${form.id}`,
          },
          { label: "Edit" },
        ]}
      />
      <PageHeader
        title={`Edit ${form.name}`}
        description="Configure incoming keys, canonical mappings and validation rules."
      />

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="fields" value={fieldsJson} />

        <Card className="max-w-3xl">
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required defaultValue={form.name} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="pageUrl">Page URL</Label>
                <Input
                  id="pageUrl"
                  name="pageUrl"
                  defaultValue={form.pageUrl ?? ""}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={2}
                  defaultValue={form.description ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactIdentityRule">Contact identity</Label>
                <select
                  id="contactIdentityRule"
                  name="contactIdentityRule"
                  defaultValue={form.contactIdentityRule}
                  className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                >
                  <option value="email_or_phone">Email or phone</option>
                  <option value="email_required">Email required</option>
                  <option value="phone_required">Phone required</option>
                  <option value="email_and_phone">Email and phone</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unknownFieldPolicy">Unknown fields</Label>
                <select
                  id="unknownFieldPolicy"
                  name="unknownFieldPolicy"
                  defaultValue={form.unknownFieldPolicy}
                  className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                >
                  <option value="ignore">Ignore</option>
                  <option value="record_field_names">Record field names</option>
                  <option value="reject">Reject submission</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="attributionEnabled">Attribution</Label>
                <select
                  id="attributionEnabled"
                  name="attributionEnabled"
                  defaultValue={form.attributionEnabled ? "true" : "false"}
                  className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="isActive">Status</Label>
                <select
                  id="isActive"
                  name="isActive"
                  defaultValue={form.isActive ? "true" : "false"}
                  className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--ink)]">Fields</h2>
          <Button type="button" variant="outline" size="sm" onClick={addField}>
            <Plus className="mr-1 h-4 w-4" />
            Add field
          </Button>
        </div>

        <div className="space-y-3">
          {fields.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-[var(--ink-muted)]">
                No fields yet. Add a field to start building the schema.
              </CardContent>
            </Card>
          ) : (
            fields.map((field, index) => (
              <Card key={field.id}>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-[var(--ink)]">
                      Field {index + 1}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => moveField(index, -1)}
                        disabled={index === 0}
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => moveField(index, 1)}
                        disabled={index === fields.length - 1}
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeField(index)}
                        aria-label="Remove field"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Label</Label>
                      <Input
                        value={field.label}
                        onChange={(event) =>
                          updateField(index, { label: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Incoming key</Label>
                      <Input
                        value={field.incomingKey}
                        onChange={(event) =>
                          updateField(index, { incomingKey: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Field type</Label>
                      <select
                        value={field.fieldType}
                        onChange={(event) =>
                          updateField(index, {
                            fieldType: event.target.value as FormFieldType,
                          })
                        }
                        className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                      >
                        {FIELD_TYPES.map((fieldType) => (
                          <option key={fieldType} value={fieldType}>
                            {fieldType}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Canonical target</Label>
                      <select
                        value={field.canonicalTarget}
                        onChange={(event) =>
                          updateField(index, {
                            canonicalTarget: event.target
                              .value as CanonicalFieldTarget,
                          })
                        }
                        className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
                      >
                        {CANONICAL_TARGETS.map((target) => (
                          <option key={target} value={target}>
                            {target}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Aliases (comma-separated)</Label>
                      <Input
                        value={field.aliases.join(", ")}
                        onChange={(event) =>
                          updateField(index, {
                            aliases: event.target.value
                              .split(",")
                              .map((alias) => alias.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(event) =>
                          updateField(index, { required: event.target.checked })
                        }
                      />
                      Required
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={field.active}
                        onChange={(event) =>
                          updateField(index, { active: event.target.checked })
                        }
                      />
                      Active
                    </label>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {state?.message ? (
          <p
            className={`text-sm ${state.success ? "text-emerald-600" : "text-[var(--danger)]"}`}
          >
            {state.message}
          </p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save form"}
        </Button>
      </form>
    </div>
  );
}
