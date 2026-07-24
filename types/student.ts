// types/student.ts
import { z } from "zod";
import { YEAR_LEVELS, VALID_SUFFIXES } from "./ticket";

// Same password policy as the staff change-password flow
export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { id: "lower", label: "One lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { id: "digit", label: "One number", test: (v: string) => /\d/.test(v) },
] as const;

export const registerStudentSchema = z
  .object({
    schoolId: z
      .string()
      .regex(/^\d{6}$/, "School ID must be exactly 6 digits"),
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
    contactNumber: z
      .string()
      .refine(
        (val) => !val || val.replace(/\D/g, "").length === 11,
        "Enter a valid 11-digit PH number",
      )
      .optional()
      .or(z.literal("")),
    email: z
      .string()
      .email("Invalid email format")
      .max(100, "Email must be 100 characters or less"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/\d/, "Password must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterStudentInput = z.infer<typeof registerStudentSchema>;
