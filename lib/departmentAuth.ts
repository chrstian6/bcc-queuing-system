// lib/departmentAuth.ts
import { baseStaffRole } from "@/lib/roles";

/**
 * Check if a staff member can access the cashier department.
 * "cashier" and "head_cashier" (and any future head-level cashier role)
 * are treated identically.
 */
export function canAccessCashier(staffRole: string): boolean {
  return baseStaffRole(staffRole) === "cashier";
}

/**
 * Check if a staff member can serve a specific transaction type (cashier only)
 */
export function canServeTransaction(transactionType: string): boolean {
  const cashierTransactions = [
    "tuition-payment",
    "miscellaneous-fee",
    "document-payment",
    "other-school-fees",
    "assessment",
  ];
  return cashierTransactions.includes(transactionType);
}

/**
 * Get all cashier transaction types
 */
export function getCashierTransactions(): string[] {
  return [
    "tuition-payment",
    "miscellaneous-fee",
    "document-payment",
    "other-school-fees",
    "assessment",
  ];
}
