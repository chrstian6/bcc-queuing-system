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
] as const;

// ─── Cashier transaction types ───────────────────────────────────────────────

export const CASHIER_TRANSACTION_TYPES = [
  "tuition-payment",
  "miscellaneous-fee",
  "document-payment",
  "other-school-fees",
  "assessment",
] as const;

// ─── Registrar transaction types ─────────────────────────────────────────────

export const REGISTRAR_TRANSACTION_TYPES = [
  "certificate-enrollment",
  "transcript-records",
  "request-grades",
  "request-assessment",
  "good-moral",
  "diploma",
  "other-document",
] as const;

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
  // Registrar transactions
  "certificate-enrollment": "Certificate of Enrollment",
  "transcript-records": "Transcript of Records",
  "request-grades": "Request for Grades",
  "request-assessment": "Request for Assessment",
  "good-moral": "Good Moral Certificate",
  diploma: "Diploma",
  "other-document": "Other Document Request",
};

// ─── Department labels ───────────────────────────────────────────────────────

const DEPARTMENT_LABELS: Record<string, string> = {
  dean: "Dean's Office",
  cashier: "Cashier",
  registrar: "Registrar",
  dsdw: "DSDW",
  general: "General",
  admin: "Admin",
};

// ─── Role labels ─────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  dean: "Dean",
  cashier: "Cashier",
  registrar: "Registrar",
  dsdw: "DSDW",
  general: "Staff",
  admin: "Admin",
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
  const shortLabels: Record<string, string> = {
    "grade-appeal": "Appeal",
    "academic-concern": "Concern",
    "course-approval": "Approval",
    "student-discipline": "Discipline",
    "faculty-concern": "Faculty",
    "curriculum-review": "Curriculum",
    "academic-advisory": "Advisory",
    "tuition-payment": "Tuition",
    "miscellaneous-fee": "Misc Fee",
    "document-payment": "Doc Payment",
    "other-school-fees": "Other Fees",
    assessment: "Assessment",
    "certificate-enrollment": "Enrollment",
    "transcript-records": "TOR",
    "request-grades": "Grades",
    "request-assessment": "Assessment",
    "good-moral": "Good Moral",
    diploma: "Diploma",
    "other-document": "Other Doc",
  };

  if (shortLabels[type]) return shortLabels[type];
  return (
    type?.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) ||
    "Unknown"
  );
}

export function getDepartmentLabel(department: string): string {
  return DEPARTMENT_LABELS[department] || department;
}

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] || role;
}

// ─── Role-based filtering ────────────────────────────────────────────────────

/**
 * Filter tickets by staff role
 * - Dean sees only dean department tickets with dean transaction types
 * - Cashier sees only cashier department tickets with cashier transaction types
 * - Registrar sees only registrar department tickets with registrar transaction types
 * - Admin sees everything
 */
export function filterTicketsByRole(tickets: any[], role: string): any[] {
  if (!tickets || tickets.length === 0) return [];

  // Admin sees everything
  if (role === "admin") return tickets;

  if (role === "dean") {
    return tickets.filter(
      (ticket) =>
        ticket.department === "dean" ||
        DEAN_TRANSACTION_TYPES.includes(ticket.transactionType),
    );
  }

  if (role === "cashier") {
    return tickets.filter(
      (ticket) =>
        ticket.department === "cashier" ||
        CASHIER_TRANSACTION_TYPES.includes(ticket.transactionType),
    );
  }

  if (role === "registrar") {
    return tickets.filter(
      (ticket) =>
        ticket.department === "registrar" ||
        REGISTRAR_TRANSACTION_TYPES.includes(ticket.transactionType),
    );
  }

  if (role === "dsdw") {
    return tickets.filter((ticket) => ticket.department === "dsdw");
  }

  if (role === "general") {
    return tickets.filter((ticket) => ticket.department === "general");
  }

  // Return all tickets for unknown roles
  return tickets;
}

// ─── Transaction type checks ─────────────────────────────────────────────────

export function isDeanTransaction(transactionType: string): boolean {
  return (DEAN_TRANSACTION_TYPES as readonly string[]).includes(
    transactionType,
  );
}

export function isCashierTransaction(transactionType: string): boolean {
  return (CASHIER_TRANSACTION_TYPES as readonly string[]).includes(
    transactionType,
  );
}

export function isRegistrarTransaction(transactionType: string): boolean {
  return (REGISTRAR_TRANSACTION_TYPES as readonly string[]).includes(
    transactionType,
  );
}

export function getTransactionRole(transactionType: string): string {
  if (isDeanTransaction(transactionType)) return "dean";
  if (isCashierTransaction(transactionType)) return "cashier";
  if (isRegistrarTransaction(transactionType)) return "registrar";
  return "unknown";
}

// ─── Department helpers ──────────────────────────────────────────────────────

export function getDepartmentFromRole(role: string): string {
  const roleMap: Record<string, string> = {
    dean: "dean",
    cashier: "cashier",
    registrar: "registrar",
    dsdw: "dsdw",
    general: "general",
    admin: "admin",
  };
  return roleMap[role] || role;
}

/**
 * Get valid transaction types for a given role
 */
export function getValidTransactionTypesForRole(role: string): string[] {
  if (role === "dean") return [...DEAN_TRANSACTION_TYPES];
  if (role === "cashier") return [...CASHIER_TRANSACTION_TYPES];
  if (role === "registrar") return [...REGISTRAR_TRANSACTION_TYPES];
  return [];
}

/**
 * Get all transaction types (for admin)
 */
export function getAllTransactionTypes(): string[] {
  return [
    ...DEAN_TRANSACTION_TYPES,
    ...CASHIER_TRANSACTION_TYPES,
    ...REGISTRAR_TRANSACTION_TYPES,
  ];
}

/**
 * Check if staff can access a ticket
 */
export function canAccessTicket(
  staffRole: string,
  ticketDepartment: string,
  ticketTransactionType: string,
): boolean {
  if (staffRole === "admin") return true;

  const roleToDepartment: Record<string, string> = {
    dean: "dean",
    cashier: "cashier",
    registrar: "registrar",
    dsdw: "dsdw",
    general: "general",
  };

  const expectedDepartment = roleToDepartment[staffRole];

  if (!expectedDepartment) return false;

  // Check if ticket belongs to the staff's department
  if (ticketDepartment === expectedDepartment) return true;

  // Fallback: check transaction type
  if (staffRole === "dean" && isDeanTransaction(ticketTransactionType)) {
    return true;
  }
  if (staffRole === "cashier" && isCashierTransaction(ticketTransactionType)) {
    return true;
  }
  if (
    staffRole === "registrar" &&
    isRegistrarTransaction(ticketTransactionType)
  ) {
    return true;
  }

  return false;
}

// ─── Status helpers ──────────────────────────────────────────────────────────

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    waiting: "Waiting",
    serving: "Serving",
    completed: "Completed",
    cancelled: "Cancelled",
    "no-show": "No Show",
    skipped: "Skipped",
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-700",
    waiting: "bg-yellow-50 text-yellow-700",
    serving: "bg-blue-50 text-blue-700",
    completed: "bg-green-50 text-green-700",
    cancelled: "bg-red-50 text-red-600",
    "no-show": "bg-orange-50 text-orange-700",
    skipped: "bg-purple-50 text-purple-700",
  };
  return colors[status] || "bg-gray-50 text-gray-600";
}

export function getStatusDotColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-yellow-400",
    waiting: "bg-yellow-400",
    serving: "bg-blue-500",
    completed: "bg-green-500",
    cancelled: "bg-red-400",
    "no-show": "bg-orange-400",
    skipped: "bg-purple-400",
  };
  return colors[status] || "bg-gray-400";
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

export function formatTransactionType(type: string): string {
  return (
    type?.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) ||
    "Unknown"
  );
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
