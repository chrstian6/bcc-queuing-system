// types/ticket.ts
import { z } from "zod";

// Year Level and Campus types
export type YearLevel =
  | "Grade 7"
  | "Grade 8"
  | "Grade 9"
  | "Grade 10"
  | "Grade 11"
  | "Grade 12"
  | "1st Year"
  | "2nd Year"
  | "3rd Year"
  | "4th Year";

export type Campus =
  | "Binalbagan Catholic College - JHS Campus"
  | "Binalbagan Catholic College - Main Campus";

export const YEAR_LEVELS: YearLevel[] = [
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
];

export const CAMPUSES: Campus[] = [
  "Binalbagan Catholic College - JHS Campus",
  "Binalbagan Catholic College - Main Campus",
];

// Map year level to campus
export function getCampusForYearLevel(yearLevel: YearLevel | ""): Campus | "" {
  const jhsLevels: YearLevel[] = ["Grade 7", "Grade 8", "Grade 9", "Grade 10"];
  const mainLevels: YearLevel[] = [
    "Grade 11",
    "Grade 12",
    "1st Year",
    "2nd Year",
    "3rd Year",
    "4th Year",
  ];

  if (!yearLevel) return "";
  if (jhsLevels.includes(yearLevel as YearLevel))
    return "Binalbagan Catholic College - JHS Campus";
  if (mainLevels.includes(yearLevel as YearLevel))
    return "Binalbagan Catholic College - Main Campus";
  return "";
}

// Valid transaction types
export const VALID_TRANSACTION_TYPES = [
  "tuition-payment",
  "miscellaneous-fee",
  "document-payment",
  "other-school-fees",
  "assessment",
] as const;

export type TransactionType = (typeof VALID_TRANSACTION_TYPES)[number];

// Valid statuses
export const VALID_STATUSES = [
  "pending",
  "serving",
  "completed",
  "cancelled",
] as const;

export type TicketStatus = (typeof VALID_STATUSES)[number];

// Valid departments
export const VALID_DEPARTMENTS = [
  "registrar",
  "dean",
  "dsdw",
  "cashier",
  "general",
] as const;

export type Department = (typeof VALID_DEPARTMENTS)[number];

// Valid requester types
export const VALID_REQUESTER_TYPES = ["student", "guardian"] as const;
export type RequesterType = (typeof VALID_REQUESTER_TYPES)[number];

// Valid guardian relationships
export const VALID_RELATIONSHIPS = [
  "Father",
  "Mother",
  "Guardian",
  "Other",
] as const;

export type Relationship = (typeof VALID_RELATIONSHIPS)[number];

// Valid suffixes
export const VALID_SUFFIXES = [
  "",
  "Jr.",
  "Sr.",
  "II",
  "III",
  "IV",
  "V",
] as const;
export type Suffix = (typeof VALID_SUFFIXES)[number];

// Zod Schemas
export const studentSchema = z.object({
  schoolId: z
    .string()
    .max(15, "School ID must be 15 characters or less")
    .refine(
      (val) => !val || /^\d+$/.test(val),
      "School ID must contain only digits",
    )
    .refine(
      (val) => !val || val.length >= 4,
      "School ID must be at least 4 digits",
    )
    .optional()
    .or(z.literal("")),
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be 50 characters or less")
    .trim(),
  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must be 50 characters or less")
    .trim(),
  middleName: z
    .string()
    .max(50, "Middle name must be 50 characters or less")
    .trim()
    .optional()
    .or(z.literal("")),
  suffix: z
    .enum(VALID_SUFFIXES as unknown as [string, ...string[]])
    .optional()
    .or(z.literal("")),
  year: z.enum(
    YEAR_LEVELS as unknown as [string, ...string[]],
    "Year level is required",
  ),
  campus: z.enum(
    CAMPUSES as unknown as [string, ...string[]],
    "Campus is required",
  ),
  email: z
    .string()
    .email("Invalid email format")
    .max(100, "Email must be 100 characters or less")
    .optional()
    .or(z.literal("")),
  contactNumber: z
    .string()
    .refine(
      (val) => !val || val.replace(/\D/g, "").length === 11,
      "Enter a valid 11-digit PH number",
    )
    .optional()
    .or(z.literal("")),
});

export const guardianSchema = z.object({
  guardianFirstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be 50 characters or less")
    .trim(),
  guardianLastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must be 50 characters or less")
    .trim(),
  guardianMiddleName: z
    .string()
    .max(50, "Middle name must be 50 characters or less")
    .trim()
    .optional()
    .or(z.literal("")),
  relationship: z.enum(
    VALID_RELATIONSHIPS as unknown as [string, ...string[]],
    "Relationship is required",
  ),
  email: z
    .string()
    .email("Invalid email format")
    .max(100, "Email must be 100 characters or less")
    .optional()
    .or(z.literal("")),
  contactNumber: z
    .string()
    .refine(
      (val) => !val || val.replace(/\D/g, "").length === 11,
      "Enter a valid 11-digit PH number",
    )
    .optional()
    .or(z.literal("")),
});

export const createTicketSchema = z
  .object({
    transactionType: z.enum(
      VALID_TRANSACTION_TYPES as unknown as [string, ...string[]],
      "Transaction type is required",
    ),
    transactionDescription: z
      .string()
      .max(200, "Description must be 200 characters or less")
      .trim()
      .optional()
      .or(z.literal("")),
    amount: z
      .number()
      .positive("Amount must be greater than 0")
      .max(999999999999, "Amount exceeds maximum limit")
      .refine(
        (val) => /^\d+(\.\d{1,2})?$/.test(val.toString()),
        "Amount must have at most 2 decimal places",
      ),
    department: z
      .enum(VALID_DEPARTMENTS as unknown as [string, ...string[]])
      .default("cashier"),
    student: studentSchema,
    requesterType: z.enum(
      VALID_REQUESTER_TYPES as unknown as [string, ...string[]],
      "Requester type is required",
    ),
    guardian: guardianSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.requesterType === "student") {
        return data.student.email?.trim() || data.student.contactNumber?.trim();
      }
      return true;
    },
    {
      message: "Provide at least email or contact number",
      path: ["student"],
    },
  )
  .refine(
    (data) => {
      if (data.requesterType === "guardian") {
        if (!data.guardian) return false;
        return (
          data.guardian.email?.trim() || data.guardian.contactNumber?.trim()
        );
      }
      return true;
    },
    {
      message: "Guardian information is required with email or contact number",
      path: ["guardian"],
    },
  )
  .refine(
    (data) => {
      if (data.transactionType === "other-school-fees") {
        return (
          data.transactionDescription &&
          data.transactionDescription.trim().length > 0
        );
      }
      return true;
    },
    {
      message: "Description is required for this transaction type",
      path: ["transactionDescription"],
    },
  );

// Type inference from Zod schemas
export type StudentFormData = z.infer<typeof studentSchema>;
export type GuardianFormData = z.infer<typeof guardianSchema>;
export type CreateTicketFormData = z.infer<typeof createTicketSchema>;

// Ticket interface matching the model
export interface ITicket {
  ticketNumber: string;
  ticketId: string;
  transactionType: TransactionType;
  transactionDescription?: string;
  amount: number;
  department: Department;
  status: TicketStatus;
  student: {
    schoolId: string;
    firstName: string;
    lastName: string;
    middleName: string;
    suffix: string;
    year: YearLevel;
    campus: Campus;
  };
  requester: {
    type: RequesterType;
    email: string;
    contactNumber: string;
  };
  guardian?: {
    firstName: string;
    lastName: string;
    middleName: string;
    relationship: Relationship;
    email: string;
    contactNumber: string;
  };
  assignedTo?: string;
  servedBy?: string;
  servingWindow?: string;
  createdAt: Date;
  updatedAt: Date;
  servedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  statusHistory: Array<{
    status: TicketStatus;
    timestamp: Date;
    changedBy?: string;
  }>;
  waitTime?: number;
  serviceTime?: number;
  totalTime?: number;
}
