// lib/departmentAuth.ts

/**
 * Check if a staff member can access the cashier department
 */
export function canAccessCashier(staffRole: string): boolean {
  return staffRole === "cashier";
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
