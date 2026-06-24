// lib/departmentAuth.ts

/**
 * Check if a staff member can access a specific department's resources
 */
export function canAccessDepartment(
  staffRole: string,
  department: string,
): boolean {
  // Staff can only access their own department
  return staffRole === department;
}

/**
 * Check if a staff member can serve a specific transaction type
 */
export function canServeTransaction(
  staffRole: string,
  transactionType: string,
): boolean {
  const transactionDepartmentMap: Record<string, string> = {
    tor: "registrar",
    coe: "registrar",
    "request-grades": "registrar",
    assessment: "registrar",
    certificate: "registrar",
    "enrollment-fees": "cashier",
    "exam-fees": "cashier",
    payments: "cashier",
  };

  const requiredDepartment =
    transactionDepartmentMap[transactionType] || "general";
  return staffRole === requiredDepartment;
}

/**
 * Get allowed transaction types for a staff role
 */
export function getAllowedTransactions(staffRole: string): string[] {
  const transactionDepartmentMap: Record<string, string> = {
    tor: "registrar",
    coe: "registrar",
    "request-grades": "registrar",
    assessment: "registrar",
    certificate: "registrar",
    "enrollment-fees": "cashier",
    "exam-fees": "cashier",
    payments: "cashier",
  };

  return Object.entries(transactionDepartmentMap)
    .filter(([_, dept]) => dept === staffRole)
    .map(([transaction]) => transaction);
}
