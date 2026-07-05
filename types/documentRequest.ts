// types/documentRequest.ts
import { z } from "zod";

export const VALID_DOCUMENT_TYPES = ["tor", "coe", "other"] as const;
export type DocumentType = (typeof VALID_DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  tor: "Transcript of Records",
  coe: "Certificate of Enrollment",
  other: "Other Document",
};

export const VALID_REQUEST_STATUSES = [
  "pending",
  "processing",
  "ready-for-pickup",
  "released",
  "rejected",
] as const;
export type DocumentRequestStatus = (typeof VALID_REQUEST_STATUSES)[number];

export const REQUEST_STATUS_LABELS: Record<DocumentRequestStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  "ready-for-pickup": "Ready for Pickup",
  released: "Released",
  rejected: "Rejected",
};

export const MAX_ACTIVE_REQUESTS = 3;

export const createDocumentRequestSchema = z
  .object({
    documentType: z.enum(VALID_DOCUMENT_TYPES, "Select a document type"),
    otherDescription: z
      .string()
      .max(200, "Description must be 200 characters or less")
      .trim()
      .optional()
      .or(z.literal("")),
    purpose: z
      .string()
      .min(5, "Purpose must be at least 5 characters")
      .max(300, "Purpose must be 300 characters or less")
      .trim(),
    copies: z
      .number()
      .int("Copies must be a whole number")
      .min(1, "At least 1 copy")
      .max(5, "Maximum of 5 copies"),
  })
  .refine(
    (data) =>
      data.documentType !== "other" ||
      (data.otherDescription && data.otherDescription.trim().length > 0),
    {
      message: "Please describe the document you need",
      path: ["otherDescription"],
    },
  );

export type CreateDocumentRequestInput = z.infer<
  typeof createDocumentRequestSchema
>;
