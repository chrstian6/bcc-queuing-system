// lib/ticketUtils.ts

// ─── Dean transaction types ──────────────────────────────────────────────────

export const DEAN_TRANSACTION_TYPES = [
  "grade-appeal",
  "academic-concern",
  "course-approval",
  "student-discipline",
  "faculty-concern",
  "curriculum-review",
  "academic-advisory",
  "other-dean-request",
];

// ─── Cashier transaction types ───────────────────────────────────────────────

export const CASHIER_TRANSACTION_TYPES = [
  "tuition-payment",
  "miscellaneous-fee",
  "document-payment",
  "other-school-fees",
  "assessment",
];

// ─── Transaction display labels ──────────────────────────────────────────────

const TRANSACTION_LABELS: Record<string, string> = {
  // Dean transactions
  "grade-appeal": "Grade Appeal",
  "academic-concern": "Academic Concern",
  "course-approval": "Course Approval",
  "student-discipline": "Student Discipline",
  "faculty-concern": "Faculty Concern",
  "curriculum-review": "Curriculum Review",
  "academic-advisory": "Academic Advisory",
  "other-dean-request": "Other Request",
  // Cashier transactions
  "tuition-payment": "Tuition Payment",
  "miscellaneous-fee": "Miscellaneous Fee",
  "document-payment": "Document Payment",
  "other-school-fees": "Other School Fees",
  assessment: "Assessment",
};

// ─── Label helpers ───────────────────────────────────────────────────────────

export function getTransactionLabel(
  type: string,
  description?: string,
): string {
  if (TRANSACTION_LABELS[type]) {
    return TRANSACTION_LABELS[type];
  }
  return (
    type?.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) ||
    "Unknown"
  );
}

export function getTransactionShortLabel(type: string): string {
  return (
    type?.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) ||
    "Unknown"
  );
}

// ─── Role-based filtering ────────────────────────────────────────────────────

export function filterTicketsByRole(tickets: any[], role: string): any[] {
  if (!tickets || tickets.length === 0) return [];

  if (role === "dean") {
    return tickets.filter((ticket) =>
      DEAN_TRANSACTION_TYPES.includes(ticket.transactionType),
    );
  }

  if (role === "cashier") {
    return tickets.filter((ticket) =>
      CASHIER_TRANSACTION_TYPES.includes(ticket.transactionType),
    );
  }

  // Return all tickets for unknown roles
  return tickets;
}

// ─── Transaction type checks ─────────────────────────────────────────────────

export function isDeanTransaction(transactionType: string): boolean {
  return DEAN_TRANSACTION_TYPES.includes(transactionType);
}

export function isCashierTransaction(transactionType: string): boolean {
  return CASHIER_TRANSACTION_TYPES.includes(transactionType);
}

export function getTransactionRole(transactionType: string): string {
  if (isDeanTransaction(transactionType)) return "dean";
  if (isCashierTransaction(transactionType)) return "cashier";
  return "unknown";
}
