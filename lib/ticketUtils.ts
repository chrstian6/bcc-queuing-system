// lib/ticketUtils.ts

// Transaction to department mapping
export const TRANSACTION_DEPARTMENT_MAP: Record<string, string> = {
  tor: "registrar",
  coe: "registrar",
  "request-grades": "registrar",
  assessment: "registrar",
  certificate: "registrar",
  "enrollment-fees": "cashier",
  "exam-fees": "cashier",
  payments: "cashier",
};

/**
 * Get department for a transaction type
 */
export function getDepartmentForTransaction(transactionType: string): string {
  return TRANSACTION_DEPARTMENT_MAP[transactionType] || "general";
}
