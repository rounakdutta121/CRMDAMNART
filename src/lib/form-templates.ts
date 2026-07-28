import { createFieldDefinition } from "@/lib/form-schema";
import type { FormFieldDefinition } from "@/types/form";

export type FormTemplateId =
  | "basic_contact"
  | "service_enquiry"
  | "training_enquiry"
  | "newsletter"
  | "consultation"
  | "blank";

export const FORM_TEMPLATE_IDS: FormTemplateId[] = [
  "basic_contact",
  "service_enquiry",
  "training_enquiry",
  "newsletter",
  "consultation",
  "blank",
];

export const FORM_TEMPLATE_LABELS: Record<FormTemplateId, string> = {
  basic_contact: "Basic Contact",
  service_enquiry: "Service Enquiry",
  training_enquiry: "Training Enquiry",
  newsletter: "Newsletter",
  consultation: "Consultation",
  blank: "Blank Form",
};

function basicContactTemplate(): FormFieldDefinition[] {
  return [
    createFieldDefinition({
      incomingKey: "name",
      aliases: ["fullName", "full_name"],
      label: "Name",
      fieldType: "text",
      canonicalTarget: "contact.name",
      required: true,
      order: 1,
      searchable: true,
    }),
    createFieldDefinition({
      incomingKey: "email",
      aliases: ["workEmail", "work_email"],
      label: "Email",
      fieldType: "email",
      canonicalTarget: "contact.email",
      required: true,
      order: 2,
      normalizeValue: true,
      searchable: true,
    }),
    createFieldDefinition({
      incomingKey: "phone",
      aliases: ["mobile", "phoneNum", "Phone-Number"],
      label: "Phone",
      fieldType: "phone",
      canonicalTarget: "contact.phone",
      required: false,
      order: 3,
      normalizeValue: true,
      searchable: true,
    }),
    createFieldDefinition({
      incomingKey: "message",
      aliases: ["query", "details", "reqText", "msg", "help_message"],
      label: "Message",
      fieldType: "textarea",
      canonicalTarget: "lead.message",
      required: false,
      order: 4,
    }),
  ];
}

function serviceEnquiryTemplate(): FormFieldDefinition[] {
  return [
    createFieldDefinition({
      incomingKey: "name",
      aliases: ["fullName", "full_name"],
      label: "Name",
      fieldType: "text",
      canonicalTarget: "contact.name",
      required: true,
      order: 1,
      searchable: true,
    }),
    createFieldDefinition({
      incomingKey: "email",
      aliases: ["workEmail", "work_email"],
      label: "Email",
      fieldType: "email",
      canonicalTarget: "contact.email",
      required: true,
      order: 2,
      normalizeValue: true,
      searchable: true,
    }),
    createFieldDefinition({
      incomingKey: "phone",
      aliases: ["mobile", "phoneNum", "Phone-Number"],
      label: "Phone",
      fieldType: "phone",
      canonicalTarget: "contact.phone",
      required: false,
      order: 3,
      normalizeValue: true,
      searchable: true,
    }),
    createFieldDefinition({
      incomingKey: "company",
      label: "Company",
      fieldType: "text",
      canonicalTarget: "contact.company",
      required: false,
      order: 4,
      searchable: true,
    }),
    createFieldDefinition({
      incomingKey: "service",
      aliases: ["inquiryType", "services", "requirement", "requirements"],
      label: "Service",
      fieldType: "text",
      canonicalTarget: "lead.service",
      required: false,
      order: 5,
      searchable: true,
    }),
    createFieldDefinition({
      incomingKey: "message",
      aliases: ["query", "details", "reqText", "msg"],
      label: "Message",
      fieldType: "textarea",
      canonicalTarget: "lead.message",
      required: false,
      order: 6,
    }),
    createFieldDefinition({
      incomingKey: "location",
      aliases: ["city", "region"],
      label: "Location",
      fieldType: "text",
      canonicalTarget: "contact.city",
      required: false,
      order: 7,
    }),
  ];
}

function trainingEnquiryTemplate(): FormFieldDefinition[] {
  return [
    createFieldDefinition({
      incomingKey: "name",
      aliases: ["fullName", "full_name"],
      label: "Name",
      fieldType: "text",
      canonicalTarget: "contact.name",
      required: true,
      order: 1,
      searchable: true,
    }),
    createFieldDefinition({
      incomingKey: "email",
      aliases: ["workEmail", "work_email"],
      label: "Email",
      fieldType: "email",
      canonicalTarget: "contact.email",
      required: true,
      order: 2,
      normalizeValue: true,
      searchable: true,
    }),
    createFieldDefinition({
      incomingKey: "phone",
      aliases: ["mobile", "phoneNum", "Phone-Number"],
      label: "Phone",
      fieldType: "phone",
      canonicalTarget: "contact.phone",
      required: false,
      order: 3,
      normalizeValue: true,
      searchable: true,
    }),
    createFieldDefinition({
      incomingKey: "course",
      aliases: ["program", "inquiryType", "service"],
      label: "Course",
      fieldType: "text",
      canonicalTarget: "lead.service",
      required: false,
      order: 4,
      searchable: true,
    }),
    createFieldDefinition({
      incomingKey: "location",
      aliases: ["city", "region"],
      label: "Location",
      fieldType: "text",
      canonicalTarget: "contact.city",
      required: false,
      order: 5,
    }),
    createFieldDefinition({
      incomingKey: "message",
      aliases: ["query", "details", "reqText", "msg"],
      label: "Message",
      fieldType: "textarea",
      canonicalTarget: "lead.message",
      required: false,
      order: 6,
    }),
  ];
}

function newsletterTemplate(): FormFieldDefinition[] {
  return [
    createFieldDefinition({
      incomingKey: "name",
      aliases: ["fullName", "full_name"],
      label: "Name",
      fieldType: "text",
      canonicalTarget: "contact.name",
      required: false,
      order: 1,
      searchable: true,
    }),
    createFieldDefinition({
      incomingKey: "email",
      aliases: ["workEmail", "work_email"],
      label: "Email",
      fieldType: "email",
      canonicalTarget: "contact.email",
      required: true,
      order: 2,
      normalizeValue: true,
      searchable: true,
    }),
  ];
}

function consultationTemplate(): FormFieldDefinition[] {
  return [
    createFieldDefinition({
      incomingKey: "name",
      aliases: ["fullName", "full_name"],
      label: "Name",
      fieldType: "text",
      canonicalTarget: "contact.name",
      required: true,
      order: 1,
      searchable: true,
    }),
    createFieldDefinition({
      incomingKey: "workEmail",
      aliases: ["email", "work_email"],
      label: "Work Email",
      fieldType: "email",
      canonicalTarget: "contact.email",
      required: true,
      order: 2,
      normalizeValue: true,
      searchable: true,
    }),
    createFieldDefinition({
      incomingKey: "phone",
      aliases: ["mobile", "phoneNum", "Phone-Number"],
      label: "Phone",
      fieldType: "phone",
      canonicalTarget: "contact.phone",
      required: false,
      order: 3,
      normalizeValue: true,
      searchable: true,
    }),
    createFieldDefinition({
      incomingKey: "company",
      label: "Company",
      fieldType: "text",
      canonicalTarget: "contact.company",
      required: false,
      order: 4,
      searchable: true,
    }),
    createFieldDefinition({
      incomingKey: "requirement",
      aliases: ["requirements", "inquiryType", "service"],
      label: "Requirement",
      fieldType: "text",
      canonicalTarget: "lead.service",
      required: false,
      order: 5,
      searchable: true,
    }),
    createFieldDefinition({
      incomingKey: "message",
      aliases: ["query", "details", "reqText", "msg"],
      label: "Message",
      fieldType: "textarea",
      canonicalTarget: "lead.message",
      required: false,
      order: 6,
    }),
  ];
}

function blankTemplate(): FormFieldDefinition[] {
  return [];
}

const TEMPLATE_BUILDERS: Record<
  FormTemplateId,
  () => FormFieldDefinition[]
> = {
  basic_contact: basicContactTemplate,
  service_enquiry: serviceEnquiryTemplate,
  training_enquiry: trainingEnquiryTemplate,
  newsletter: newsletterTemplate,
  consultation: consultationTemplate,
  blank: blankTemplate,
};

export function getFormTemplate(templateId: FormTemplateId): FormFieldDefinition[] {
  return TEMPLATE_BUILDERS[templateId]();
}

export function isFormTemplateId(value: string): value is FormTemplateId {
  return FORM_TEMPLATE_IDS.includes(value as FormTemplateId);
}
