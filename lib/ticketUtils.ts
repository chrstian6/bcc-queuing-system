// lib/ticketUtils.ts

/**
 * Get the department for a given transaction type
 */
export function getDepartmentForTransaction(transactionType: string): string {
  // All transaction types go to cashier
  const cashierTransactions = [
    "tuition-payment",
    "miscellaneous-fee",
    "document-payment",
    "other-school-fees",
    "assessment",
  ];

  if (cashierTransactions.includes(transactionType)) {
    return "cashier";
  }

  return "general";
}

/**
 * Get human-readable label for transaction type
 */
export function getTransactionLabel(
  type: string,
  description?: string,
): string {
  const labels: Record<string, string> = {
    "tuition-payment": "Tuition Payment",
    "miscellaneous-fee": "Miscellaneous Fee Payment",
    "document-payment": "Document Payment",
    "other-school-fees": "Other School Fees",
    assessment: "Assessment",
  };

  const baseLabel = labels[type] || type.replace(/-/g, " ");

  // Append description for types that need it
  if (
    description &&
    ["other-school-fees", "miscellaneous-fee"].includes(type)
  ) {
    return `${baseLabel} - ${description}`;
  }

  return baseLabel;
}

/**
 * Check if a transaction type requires a description
 */
export function requiresDescription(transactionType: string): boolean {
  return ["other-school-fees", "miscellaneous-fee"].includes(transactionType);
}

/**
 * Get all valid cashier transaction types
 */
export function getCashierTransactionTypes(): Array<{
  value: string;
  label: string;
  requiresDescription: boolean;
}> {
  return [
    {
      value: "tuition-payment",
      label: "Tuition Payment",
      requiresDescription: false,
    },
    {
      value: "miscellaneous-fee",
      label: "Miscellaneous Fee Payment",
      requiresDescription: true,
    },
    {
      value: "document-payment",
      label: "Document Payment",
      requiresDescription: false,
    },
    {
      value: "other-school-fees",
      label: "Other School Fees",
      requiresDescription: true,
    },
    { value: "assessment", label: "Assessment", requiresDescription: false },
  ];
}
