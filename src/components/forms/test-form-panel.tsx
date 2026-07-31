"use client";

import Link from "next/link";
import { useActionState } from "react";
import { testFormSubmissionAction, type ActionResult } from "@/app/actions";
import { GlobalLoadingSync } from "@/components/shared/global-loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FormFieldDefinition } from "@/types/form";

const initial: ActionResult = { success: false, message: "" };

function renderFieldInput(field: FormFieldDefinition, idPrefix = "") {
  const inputId = `${idPrefix}${field.incomingKey}`;

  if (field.fieldType === "textarea") {
    return (
      <Textarea
        id={inputId}
        name={field.incomingKey}
        required={field.required}
        placeholder={field.placeholder}
      />
    );
  }

  if (field.fieldType === "select" && field.options?.length) {
    return (
      <select
        id={inputId}
        name={field.incomingKey}
        required={field.required}
        className="h-10 w-full rounded-md border border-[var(--border)] px-3 text-sm"
        defaultValue=""
      >
        <option value="">Select…</option>
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.fieldType === "boolean" || field.fieldType === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name={field.incomingKey} value="true" />
        {field.label}
      </label>
    );
  }

  const inputType =
    field.fieldType === "email"
      ? "email"
      : field.fieldType === "number"
        ? "number"
        : field.fieldType === "date"
          ? "date"
          : field.fieldType === "datetime"
            ? "datetime-local"
            : field.fieldType === "url"
              ? "url"
              : field.fieldType === "phone"
                ? "tel"
                : "text";

  return (
    <Input
      id={inputId}
      name={field.incomingKey}
      type={inputType}
      required={field.required}
      placeholder={field.placeholder}
    />
  );
}

export function TestFormPanel({
  websiteId,
  formId,
  fields,
}: {
  websiteId: string;
  formId: string;
  fields: FormFieldDefinition[];
}) {
  const validateAction = testFormSubmissionAction.bind(
    null,
    websiteId,
    formId,
    true
  );
  const submitAction = testFormSubmissionAction.bind(
    null,
    websiteId,
    formId,
    false
  );
  const [validateState, validateFormAction, validatePending] = useActionState(
    validateAction,
    initial
  );
  const [submitState, submitFormAction, submitPending] = useActionState(
    submitAction,
    initial
  );

  const activeFields = fields
    .filter((field) => field.active)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <GlobalLoadingSync pending={validatePending || submitPending} />
      <Card>
        <CardHeader>
          <CardTitle>Validate submission</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={validateFormAction} className="space-y-4">
            {activeFields.map((field) => (
              <div key={field.id} className="space-y-2">
                {field.fieldType === "boolean" ||
                field.fieldType === "checkbox" ? (
                  renderFieldInput(field, "validate-")
                ) : (
                  <>
                    <Label htmlFor={`validate-${field.incomingKey}`}>
                      {field.label}
                      {field.required ? " *" : ""}
                    </Label>
                    {renderFieldInput(field, "validate-")}
                  </>
                )}
              </div>
            ))}
            {validateState?.message ? (
              <p
                className={`text-sm ${validateState.success ? "text-emerald-600" : "text-[var(--danger)]"}`}
              >
                {validateState.message}
              </p>
            ) : null}
            <Button type="submit" variant="outline" disabled={validatePending}>
              {validatePending ? "Validating…" : "Validate only"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create test lead</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={submitFormAction} className="space-y-4">
            {activeFields.map((field) => (
              <div key={`submit-${field.id}`} className="space-y-2">
                {field.fieldType === "boolean" ||
                field.fieldType === "checkbox" ? (
                  renderFieldInput(field, "submit-")
                ) : (
                  <>
                    <Label htmlFor={`submit-${field.incomingKey}`}>
                      {field.label}
                      {field.required ? " *" : ""}
                    </Label>
                    {renderFieldInput(field, "submit-")}
                  </>
                )}
              </div>
            ))}
            {submitState?.message ? (
              <p
                className={`text-sm ${submitState.success ? "text-emerald-600" : "text-[var(--danger)]"}`}
              >
                {submitState.message}
                {submitState.success &&
                submitState.data &&
                typeof submitState.data.leadId === "string" ? (
                  <>
                    {" "}
                    <Link
                      href={`/leads/${submitState.data.leadId}`}
                      className="font-medium underline"
                    >
                      View lead
                    </Link>
                  </>
                ) : null}
              </p>
            ) : null}
            <Button type="submit" disabled={submitPending}>
              {submitPending ? "Creating…" : "Create test lead"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
