import type { ObjectId } from "mongodb";

export type IntegrationLogStatus =
  | "received"
  | "successful"
  | "rejected"
  | "idempotent_replay"
  | "failed";

export interface IntegrationLog {
  _id: ObjectId;
  websiteId?: ObjectId;
  formId?: ObjectId;
  formCode?: string;
  formSchemaVersion?: number;
  integrationType: "website" | "n8n" | "apps_script" | "import" | "other";
  endpoint: string;
  requestMethod: string;
  idempotencyKey?: string;
  externalSubmissionId?: string;
  status: IntegrationLogStatus;
  leadId?: ObjectId;
  receivedFieldNames?: string[];
  mappedFieldNames?: string[];
  ignoredFieldNames?: string[];
  unknownFieldNames?: string[];
  validationErrors?: Array<{ field: string; message: string }>;
  testSubmission?: boolean;
  errorCode?: string;
  safeErrorMessage?: string;
  processingDurationMs?: number;
  createdAt: Date;
}
