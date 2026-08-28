// components/public/TransactionModal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, X, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  YearLevel,
  Campus,
  YEAR_LEVELS,
  CAMPUSES,
  getCampusForYearLevel,
} from "@/types/ticket";
import { createTicket } from "@/actions/ticket";
import {
  getQueueAvailability,
  type QueueAvailability,
} from "@/actions/queue-status";
import TranscriptOfRecordsModal from "./TranscriptOfRecordsModal";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTransaction?: string | null;
  department?: string | null;
}

interface StudentInfo {
  schoolId: string;
  firstName: string;
  lastName: string;
  middleName: string;
  suffix: string;
  year: YearLevel | "";
  campus: Campus | "";
  email: string;
  contactNumber: string;
}

interface GuardianInfo {
  guardianFirstName: string;
  guardianLastName: string;
  guardianMiddleName: string;
  relationship: string;
  email: string;
  contactNumber: string;
}

const SUFFIXES = ["", "Jr.", "Sr.", "II", "III", "IV", "V"];

const ALL_TRANSACTIONS: Record<string, { label: string; department: string }> =
  {
    // Dean
    "grade-appeal": { label: "Grade Appeal", department: "dean" },
    "academic-concern": { label: "Academic Concern", department: "dean" },
    "course-approval": { label: "Course Approval", department: "dean" },
    "student-discipline": { label: "Student Discipline", department: "dean" },
    "faculty-concern": { label: "Faculty Concern", department: "dean" },
    "curriculum-review": { label: "Curriculum Review", department: "dean" },
    "academic-advisory": { label: "Academic Advisory", department: "dean" },
    // Cashier
    "tuition-payment": { label: "Tuition Payment", department: "cashier" },
    "miscellaneous-fee": {
      label: "Miscellaneous Fee Payment",
      department: "cashier",
    },
    "document-payment": { label: "Document Payment", department: "cashier" },
    "other-school-fees": { label: "Other School Fees", department: "cashier" },
    assessment: { label: "Assessment", department: "cashier" },
    // Registrar
    "certificate-enrollment": {
      label: "Certificate of Enrollment",
      department: "registrar",
    },
    "transcript-records": {
      label: "Transcript of Records",
      department: "registrar",
    },
    "request-grades": { label: "Request for Grades", department: "registrar" },
    "request-assessment": {
      label: "Request for Assessment",
      department: "registrar",
    },
    "good-moral": { label: "Good Moral Certificate", department: "registrar" },
    diploma: { label: "Diploma", department: "registrar" },
    "other-document": {
      label: "Other Document Request",
      department: "registrar",
    },
  };

function getTransactionLabel(type: string): string {
  return (
    ALL_TRANSACTIONS[type]?.label ||
    type?.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()) ||
    "Unknown"
  );
}

function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/[<>'"]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/--/g, "")
    .replace(/;/g, "")
    .replace(/\/\*/g, "")
    .replace(/\*\//g, "")
    .replace(/xp_/gi, "")
    .replace(/sp_/gi, "")
    .replace(/exec\s*\(/gi, "")
    .replace(/execute\s*\(/gi, "")
    .replace(/union\s+select/gi, "")
    .replace(/select\s+/gi, "")
    .replace(/insert\s+into/gi, "")
    .replace(/delete\s+from/gi, "")
    .replace(/drop\s+table/gi, "")
    .replace(/update\s+\w+\s+set/gi, "")
    .trim();
}

function formatPHMobileNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 4) return digits;
  else if (digits.length <= 7)
    return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  else return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

function formatAmountWithCommas(value: string): string {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) return parts[0] + "." + parts.slice(1).join("");
  if (parts[0].length > 12) parts[0] = parts[0].slice(0, 12);
  if (parts.length === 2 && parts[1].length > 2)
    return parts[0] + "." + parts[1].slice(0, 2);
  const wholePart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (parts.length === 2) return wholePart + "." + parts[1];
  return wholePart;
}

function getShortCampusName(campus: Campus | ""): string {
  if (!campus) return "";
  return campus.replace("Binalbagan Catholic College - ", "");
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block text-[12px] font-semibold text-[#475569] mb-1.5"
        style={{ fontFamily: "var(--font-geist-sans)" }}
      >
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p
          className="text-[11px] text-red-500 mt-1"
          style={{ fontFamily: "var(--font-geist-sans)" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

function AutoCloseCountdown({ onClose }: { onClose: () => void }) {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (countdown <= 0) {
      onClose();
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown, onClose]);

  return (
    <p
      className="text-[12px] text-[#94A3B8] mb-4"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      Auto-closing in {countdown} second{countdown !== 1 ? "s" : ""}...
    </p>
  );
}

export default function TransactionModal({
  isOpen,
  onClose,
  initialTransaction,
  department,
}: TransactionModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(
    null,
  );
  const [blueState, setBlueState] = useState<"covering" | "gone">("covering");
  const [formReady, setFormReady] = useState(false);
  const [isGuardian, setIsGuardian] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [ticketData, setTicketData] = useState<{
    ticketNumber: string;
    ticketId: string;
  } | null>(null);
  const [amount, setAmount] = useState("");
  const [specifyTransaction, setSpecifyTransaction] = useState("");
  const [showTorModal, setShowTorModal] = useState(false);

  const [studentInfo, setStudentInfo] = useState<StudentInfo>({
    schoolId: "",
    firstName: "",
    lastName: "",
    middleName: "",
    suffix: "",
    year: "",
    campus: "",
    email: "",
    contactNumber: "",
  });
  const [guardianInfo, setGuardianInfo] = useState<GuardianInfo>({
    guardianFirstName: "",
    guardianLastName: "",
    guardianMiddleName: "",
    relationship: "",
    email: "",
    contactNumber: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availability, setAvailability] = useState<QueueAvailability | null>(
    null,
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    getQueueAvailability().then((result) => {
      if (!cancelled && result.success) setAvailability(result);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${window.scrollY}px`;

      // Check if this is a TOR request
      if (
        initialTransaction === "transcript-records" &&
        department === "registrar"
      ) {
        setShowTorModal(true);
        setSelectedTransaction(initialTransaction);
        // Don't set up regular form for TOR
      } else if (initialTransaction) {
        setShowTorModal(false);
        setSelectedTransaction(initialTransaction);
        setBlueState("covering");
        setTimeout(() => {
          setFormReady(true);
          setBlueState("gone");
        }, 1200);
        setStep(1);
      }
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      if (scrollY) window.scrollTo(0, parseInt(scrollY || "0") * -1);
    }
    return () => {
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      if (scrollY) window.scrollTo(0, parseInt(scrollY || "0") * -1);
    };
  }, [isOpen, initialTransaction, department]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      setTimeout(() => {
        if (scrollContainerRef.current)
          scrollContainerRef.current.scrollTop =
            scrollContainerRef.current.scrollHeight;
      }, 200);
    }
  }, [isGuardian, selectedTransaction]);

  const resetForm = () => {
    setSelectedTransaction(null);
    setStep(1);
    setBlueState("covering");
    setFormReady(false);
    setTicketData(null);
    setSubmitError("");
    setAmount("");
    setSpecifyTransaction("");
    setStudentInfo({
      schoolId: "",
      firstName: "",
      lastName: "",
      middleName: "",
      suffix: "",
      year: "",
      campus: "",
      email: "",
      contactNumber: "",
    });
    setGuardianInfo({
      guardianFirstName: "",
      guardianLastName: "",
      guardianMiddleName: "",
      relationship: "",
      email: "",
      contactNumber: "",
    });
    setIsGuardian(false);
    setErrors({});
    setShowTorModal(false);
  };

  const handleClose = () => {
    const scrollY = document.body.style.top;
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.width = "";
    document.body.style.top = "";
    if (scrollY) window.scrollTo(0, parseInt(scrollY || "0") * -1);
    setShowTorModal(false);
    onClose();
  };

  const handleTextChange = (
    setter: React.Dispatch<React.SetStateAction<any>>,
    field: string,
    value: string,
    maxLength?: number,
  ) => {
    const sanitized = sanitizeInput(value);
    const finalValue = maxLength ? sanitized.slice(0, maxLength) : sanitized;
    setter((prev: any) => ({ ...prev, [field]: finalValue }));
    clearErr(field);
  };

  const handleMobileChange = (
    setter: React.Dispatch<React.SetStateAction<any>>,
    field: string,
    value: string,
  ) => {
    const formatted = formatPHMobileNumber(value);
    setter((prev: any) => ({ ...prev, [field]: formatted }));
    clearErr(field);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAmountWithCommas(e.target.value);
    setAmount(formatted);
    clearErr("amount");
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};

    if (studentInfo.schoolId.trim()) {
      if (!/^\d+$/.test(studentInfo.schoolId))
        newErrors.schoolId = "School ID must contain only digits";
      else if (
        studentInfo.schoolId.length < 4 &&
        studentInfo.schoolId.length > 0
      )
        newErrors.schoolId = "School ID must be at least 4 digits";
    }

    if (!studentInfo.firstName.trim()) newErrors.firstName = "Required";
    else if (studentInfo.firstName.length < 2)
      newErrors.firstName = "First name must be at least 2 characters";

    if (!studentInfo.lastName.trim()) newErrors.lastName = "Required";
    else if (studentInfo.lastName.length < 2)
      newErrors.lastName = "Last name must be at least 2 characters";

    if (!studentInfo.year) newErrors.year = "Required";
    if (!studentInfo.campus) newErrors.campus = "Campus is required";

    if (
      !isGuardian &&
      !studentInfo.email.trim() &&
      !studentInfo.contactNumber.trim()
    ) {
      newErrors.studentEmail = "Provide email or contact number";
      newErrors.studentContact = "Provide email or contact number";
    }

    if (
      studentInfo.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentInfo.email)
    )
      newErrors.studentEmail = "Invalid email format";

    const studentDigits = studentInfo.contactNumber.replace(/\D/g, "");
    if (studentDigits && studentDigits.length !== 11)
      newErrors.studentContact =
        "Enter a valid 11-digit PH number (09XX XXX XXXX)";

    if (isGuardian) {
      if (!guardianInfo.guardianFirstName.trim())
        newErrors.guardianFirstName = "Required";
      else if (guardianInfo.guardianFirstName.length < 2)
        newErrors.guardianFirstName = "Must be at least 2 characters";

      if (!guardianInfo.guardianLastName.trim())
        newErrors.guardianLastName = "Required";
      else if (guardianInfo.guardianLastName.length < 2)
        newErrors.guardianLastName = "Must be at least 2 characters";

      if (!guardianInfo.relationship.trim())
        newErrors.relationship = "Required";

      if (!guardianInfo.email.trim() && !guardianInfo.contactNumber.trim()) {
        newErrors.guardianEmail = "Provide email or contact number";
        newErrors.guardianContact = "Provide email or contact number";
      }

      if (
        guardianInfo.email.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianInfo.email)
      )
        newErrors.guardianEmail = "Invalid email format";

      const guardianDigits = guardianInfo.contactNumber.replace(/\D/g, "");
      if (guardianDigits && guardianDigits.length !== 11)
        newErrors.guardianContact =
          "Enter a valid 11-digit PH number (09XX XXX XXXX)";
    }

    // Amount only required for cashier
    if (department === "cashier") {
      const rawAmount = amount.replace(/,/g, "");
      if (!rawAmount.trim()) newErrors.amount = "Amount is required";
      else if (!/^\d+(\.\d{1,2})?$/.test(rawAmount))
        newErrors.amount = "Enter a valid amount";
      else if (parseFloat(rawAmount) <= 0)
        newErrors.amount = "Amount must be greater than 0";
      else if (rawAmount.split(".")[0].length > 12)
        newErrors.amount = "Amount cannot exceed 12 digits";
    }

    if (specifyTransaction.trim() && specifyTransaction.length > 200)
      newErrors.specifyTransaction =
        "Description must be 200 characters or less";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const n = { ...prev };
      delete n[key];
      return n;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!validateStep1()) return;

    setIsSubmitting(true);
    setStep(2);
    setBlueState("covering");

    try {
      const idempotencyKey = `ticket_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

      // Always provide a number for amount (0 for non-cashier)
      const ticketAmount =
        department === "cashier"
          ? parseFloat(amount.replace(/,/g, "") || "0")
          : 0;

      const result = await createTicket({
        transactionType: selectedTransaction!,
        transactionDescription: specifyTransaction.trim() || undefined,
        amount: ticketAmount,
        student: {
          schoolId: studentInfo.schoolId.trim() || "",
          firstName: sanitizeInput(studentInfo.firstName),
          lastName: sanitizeInput(studentInfo.lastName),
          middleName: sanitizeInput(studentInfo.middleName) || undefined,
          suffix: studentInfo.suffix || undefined,
          year: studentInfo.year,
          campus: studentInfo.campus,
        },
        requesterType: isGuardian ? "guardian" : "student",
        requesterEmail: isGuardian
          ? guardianInfo.email.trim() || undefined
          : studentInfo.email.trim() || undefined,
        requesterContactNumber: isGuardian
          ? guardianInfo.contactNumber.replace(/\s/g, "") || undefined
          : studentInfo.contactNumber.replace(/\s/g, "") || undefined,
        guardian: isGuardian
          ? {
              firstName: sanitizeInput(guardianInfo.guardianFirstName),
              lastName: sanitizeInput(guardianInfo.guardianLastName),
              middleName:
                sanitizeInput(guardianInfo.guardianMiddleName) || undefined,
              relationship: guardianInfo.relationship,
            }
          : undefined,
        idempotencyKey,
      });

      if (result.success && result.ticket) {
        setTicketData({
          ticketNumber: result.ticket.ticketNumber,
          ticketId: result.ticket.ticketId,
        });
        setBlueState("gone");
        setStep(3);
      } else {
        setStep(1);
        setBlueState("gone");
        setSubmitError(
          result.error || "Failed to create ticket. Please try again.",
        );
      }
    } catch (error) {
      console.error("Error submitting ticket:", error);
      setStep(1);
      setBlueState("gone");
      setSubmitError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedLabel = selectedTransaction
    ? getTransactionLabel(selectedTransaction)
    : "";
  const hasEmail = isGuardian
    ? !!guardianInfo.email.trim()
    : !!studentInfo.email.trim();
  const hasPhone = isGuardian
    ? !!guardianInfo.contactNumber.trim()
    : !!studentInfo.contactNumber.trim();

  if (!isOpen) return null;

  return (
    <>
      {/* TOR Modal - shown when transcript-records is selected */}
      <TranscriptOfRecordsModal isOpen={showTorModal} onClose={handleClose} />

      {/* Regular Transaction Modal - hidden when TOR is shown */}
      {!showTorModal && (
        <>
          {/* Loading screen */}
          {step === 2 || (step === 1 && blueState === "covering") ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
              <div
                className="relative z-[51] bg-[#0000CC] rounded-2xl w-full max-w-sm shadow-2xl flex flex-col"
                style={{ minHeight: "300px", maxHeight: "360px" }}
              >
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="flex flex-col items-center gap-5">
                    <div className="flex items-center gap-1.5">
                      {[0, 0.15, 0.3, 0.45, 0.6].map((delay, i) => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full bg-white animate-dot-fifo"
                          style={{ animationDelay: `${delay}s` }}
                        />
                      ))}
                    </div>
                    <div className="space-y-2">
                      <p
                        className="text-white text-base font-semibold leading-tight"
                        style={{ fontFamily: "var(--font-plus-jakarta)" }}
                      >
                        {step === 2 ? "Processing Your Ticket" : selectedLabel}
                      </p>
                      <p
                        className="text-white/60 text-[13px] leading-relaxed"
                        style={{ fontFamily: "var(--font-geist-sans)" }}
                      >
                        {step === 2
                          ? "Please wait while we generate your ticket number"
                          : "Preparing your form..."}
                      </p>
                      {step === 2 && (
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-1.5 inline-block mt-1">
                          <p
                            className="text-white text-[13px] font-medium"
                            style={{ fontFamily: "var(--font-geist-sans)" }}
                          >
                            {selectedLabel}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <style>{`@keyframes dotFifo{0%,20%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.3)}80%,100%{opacity:0.3;transform:scale(0.8)}}.animate-dot-fifo{animation:dotFifo 1.2s ease-in-out infinite}`}</style>
              </div>
            </div>
          ) : (
            /* Form/Success modal */
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={step === 1 ? handleClose : undefined}
              />

              <div
                className="relative z-[51] bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col"
                style={{ maxHeight: "90vh" }}
              >
                {/* Fixed Header */}
                <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2
                        className="text-[20px] font-extrabold text-[#0F172A] leading-tight"
                        style={{ fontFamily: "var(--font-plus-jakarta)" }}
                      >
                        {step === 3 ? "All set!" : "Student Details"}
                      </h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0000CC] flex-shrink-0" />
                        <p
                          className="text-[13px] text-[#64748B] truncate"
                          style={{ fontFamily: "var(--font-geist-sans)" }}
                        >
                          {selectedLabel}
                        </p>
                      </div>
                    </div>
                    {step !== 3 && (
                      <button
                        onClick={handleClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-[#94A3B8] hover:text-[#0F172A] hover:bg-gray-100 transition-all flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {submitError && step === 1 && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <p
                        className="text-[13px] text-red-600"
                        style={{ fontFamily: "var(--font-geist-sans)" }}
                      >
                        {submitError}
                      </p>
                    </div>
                  )}
                  {availability &&
                    availability.status !== "open" &&
                    step === 1 && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <p
                          className="text-[13px] text-amber-700"
                          style={{ fontFamily: "var(--font-geist-sans)" }}
                        >
                          {availability.message ||
                            "The queue is currently unavailable. Please try again later."}
                        </p>
                      </div>
                    )}
                </div>

                {/* Scrollable Area */}
                <div
                  ref={scrollContainerRef}
                  className="overflow-y-auto"
                  data-lenis-prevent
                  style={{
                    flex: 1,
                    minHeight: 0,
                    WebkitOverflowScrolling: "touch",
                    overscrollBehavior: "contain",
                  }}
                >
                  <div className="p-6 pb-4">
                    {/* STEP 1: Form */}
                    {step === 1 && formReady && (
                      <form
                        id="transaction-form"
                        onSubmit={handleSubmit}
                        noValidate
                      >
                        <div className="space-y-4">
                          <Field
                            label="School ID (optional)"
                            error={errors.schoolId}
                          >
                            <Input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={studentInfo.schoolId}
                              onChange={(e) => {
                                const v = e.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 15);
                                setStudentInfo((p) => ({ ...p, schoolId: v }));
                                clearErr("schoolId");
                              }}
                              placeholder="Enter school ID (if applicable)"
                              maxLength={15}
                              className="rounded-xl border-[#E2E8F0] focus-visible:ring-1 focus-visible:ring-[#0000CC] focus-visible:border-[#0000CC] h-11"
                            />
                          </Field>

                          <div className="grid grid-cols-2 gap-3">
                            <Field
                              label="First name"
                              required
                              error={errors.firstName}
                            >
                              <Input
                                value={studentInfo.firstName}
                                onChange={(e) =>
                                  handleTextChange(
                                    setStudentInfo,
                                    "firstName",
                                    e.target.value,
                                    50,
                                  )
                                }
                                placeholder="Juan"
                                maxLength={50}
                                className="rounded-xl border-[#E2E8F0] focus-visible:ring-1 focus-visible:ring-[#0000CC] focus-visible:border-[#0000CC] h-11"
                              />
                            </Field>
                            <Field
                              label="Last name"
                              required
                              error={errors.lastName}
                            >
                              <Input
                                value={studentInfo.lastName}
                                onChange={(e) =>
                                  handleTextChange(
                                    setStudentInfo,
                                    "lastName",
                                    e.target.value,
                                    50,
                                  )
                                }
                                placeholder="dela Cruz"
                                maxLength={50}
                                className="rounded-xl border-[#E2E8F0] focus-visible:ring-1 focus-visible:ring-[#0000CC] focus-visible:border-[#0000CC] h-11"
                              />
                            </Field>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <Field label="Middle name">
                              <Input
                                value={studentInfo.middleName}
                                onChange={(e) =>
                                  handleTextChange(
                                    setStudentInfo,
                                    "middleName",
                                    e.target.value,
                                    50,
                                  )
                                }
                                placeholder="Santos"
                                maxLength={50}
                                className="rounded-xl border-[#E2E8F0] focus-visible:ring-1 focus-visible:ring-[#0000CC] focus-visible:border-[#0000CC] h-11"
                              />
                            </Field>
                            <Field label="Suffix">
                              <Select
                                value={studentInfo.suffix}
                                onValueChange={(v) =>
                                  setStudentInfo((p) => ({ ...p, suffix: v }))
                                }
                              >
                                <SelectTrigger className="rounded-xl border-[#E2E8F0] focus:ring-1 focus:ring-[#0000CC] h-11">
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent className="z-[9999]">
                                  {SUFFIXES.map((s) => (
                                    <SelectItem key={s || "none"} value={s}>
                                      {s || "None"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </Field>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <Field
                              label="Year level"
                              required
                              error={errors.year}
                            >
                              <Select
                                value={studentInfo.year}
                                onValueChange={(v) => {
                                  const year = v as YearLevel;
                                  setStudentInfo((p) => ({
                                    ...p,
                                    year: year,
                                    campus: getCampusForYearLevel(year),
                                  }));
                                  clearErr("year");
                                  clearErr("campus");
                                }}
                              >
                                <SelectTrigger className="rounded-xl border-[#E2E8F0] focus:ring-1 focus:ring-[#0000CC] h-11">
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent className="z-[9999]">
                                  {YEAR_LEVELS.map((y) => (
                                    <SelectItem key={y} value={y}>
                                      {y}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </Field>
                            <Field
                              label="Campus"
                              required
                              error={errors.campus}
                            >
                              <Input
                                value={
                                  studentInfo.campus
                                    ? getShortCampusName(studentInfo.campus)
                                    : ""
                                }
                                readOnly
                                disabled
                                placeholder="Select year level first"
                                className="rounded-xl border-[#E2E8F0] bg-gray-50 text-[#64748B] h-11 text-[14px] cursor-not-allowed"
                              />
                            </Field>
                          </div>

                          {/* Amount - only for cashier */}
                          {department === "cashier" && (
                            <Field
                              label="Amount to Pay (₱)"
                              required
                              error={errors.amount}
                            >
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] text-[14px] font-medium">
                                  ₱
                                </span>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={amount}
                                  onChange={handleAmountChange}
                                  placeholder="0.00"
                                  className="rounded-xl border-[#E2E8F0] focus-visible:ring-1 focus-visible:ring-[#0000CC] focus-visible:border-[#0000CC] h-11 pl-8 text-[15px] font-medium"
                                />
                              </div>
                            </Field>
                          )}

                          {selectedTransaction === "other-school-fees" && (
                            <Field
                              label="Specify transaction (optional)"
                              error={errors.specifyTransaction}
                            >
                              <Textarea
                                value={specifyTransaction}
                                onChange={(e) => {
                                  const sanitized = sanitizeInput(
                                    e.target.value,
                                  ).slice(0, 200);
                                  setSpecifyTransaction(sanitized);
                                  clearErr("specifyTransaction");
                                }}
                                placeholder="e.g., Graduation fee, Field trip payment..."
                                rows={2}
                                maxLength={200}
                                className="rounded-xl border-[#E2E8F0] focus-visible:ring-1 focus-visible:ring-[#0000CC] focus-visible:border-[#0000CC] resize-none text-[14px]"
                                style={{ fontFamily: "var(--font-geist-sans)" }}
                              />
                            </Field>
                          )}

                          <div className="border-t border-gray-100 pt-4">
                            <p
                              className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-3"
                              style={{ fontFamily: "var(--font-geist-sans)" }}
                            >
                              Contact Information
                            </p>

                            <div className="flex items-start gap-3 py-2 mb-3">
                              <Checkbox
                                id="guardian"
                                checked={isGuardian}
                                onCheckedChange={(c) =>
                                  setIsGuardian(c === true)
                                }
                                className="rounded border-[#CBD5E1] data-[state=checked]:bg-[#0000CC] data-[state=checked]:border-[#0000CC] mt-0.5"
                              />
                              <label
                                htmlFor="guardian"
                                className="cursor-pointer"
                              >
                                <span
                                  className="text-[14px] font-medium text-[#475569]"
                                  style={{
                                    fontFamily: "var(--font-geist-sans)",
                                  }}
                                >
                                  I'm a parent or guardian
                                </span>
                                <p
                                  className="text-[11px] text-[#94A3B8]"
                                  style={{
                                    fontFamily: "var(--font-geist-sans)",
                                  }}
                                >
                                  Fill out this form on behalf of a student
                                </p>
                              </label>
                            </div>

                            {isGuardian && (
                              <div className="space-y-4 bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0] mb-4">
                                <p
                                  className="text-[11px] font-semibold text-[#0000CC] uppercase tracking-wide"
                                  style={{
                                    fontFamily: "var(--font-geist-sans)",
                                  }}
                                >
                                  Guardian Information
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                  <Field
                                    label="First name"
                                    required
                                    error={errors.guardianFirstName}
                                  >
                                    <Input
                                      value={guardianInfo.guardianFirstName}
                                      onChange={(e) =>
                                        handleTextChange(
                                          setGuardianInfo,
                                          "guardianFirstName",
                                          e.target.value,
                                          50,
                                        )
                                      }
                                      placeholder="First name"
                                      maxLength={50}
                                      className="rounded-xl border-[#E2E8F0] focus-visible:ring-1 focus-visible:ring-[#0000CC] h-11 bg-white"
                                    />
                                  </Field>
                                  <Field
                                    label="Last name"
                                    required
                                    error={errors.guardianLastName}
                                  >
                                    <Input
                                      value={guardianInfo.guardianLastName}
                                      onChange={(e) =>
                                        handleTextChange(
                                          setGuardianInfo,
                                          "guardianLastName",
                                          e.target.value,
                                          50,
                                        )
                                      }
                                      placeholder="Last name"
                                      maxLength={50}
                                      className="rounded-xl border-[#E2E8F0] focus-visible:ring-1 focus-visible:ring-[#0000CC] h-11 bg-white"
                                    />
                                  </Field>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <Field label="Middle name">
                                    <Input
                                      value={guardianInfo.guardianMiddleName}
                                      onChange={(e) =>
                                        handleTextChange(
                                          setGuardianInfo,
                                          "guardianMiddleName",
                                          e.target.value,
                                          50,
                                        )
                                      }
                                      placeholder="Middle name"
                                      maxLength={50}
                                      className="rounded-xl border-[#E2E8F0] focus-visible:ring-1 focus-visible:ring-[#0000CC] h-11 bg-white"
                                    />
                                  </Field>
                                  <Field
                                    label="Relationship"
                                    required
                                    error={errors.relationship}
                                  >
                                    <Select
                                      value={guardianInfo.relationship}
                                      onValueChange={(v) => {
                                        setGuardianInfo((p) => ({
                                          ...p,
                                          relationship: v,
                                        }));
                                        clearErr("relationship");
                                      }}
                                    >
                                      <SelectTrigger className="rounded-xl border-[#E2E8F0] focus:ring-1 focus:ring-[#0000CC] h-11 bg-white">
                                        <SelectValue placeholder="Select" />
                                      </SelectTrigger>
                                      <SelectContent className="z-[9999]">
                                        {[
                                          "Father",
                                          "Mother",
                                          "Guardian",
                                          "Other",
                                        ].map((r) => (
                                          <SelectItem key={r} value={r}>
                                            {r}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </Field>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <Field
                                    label="Email"
                                    error={errors.guardianEmail}
                                  >
                                    <Input
                                      type="email"
                                      value={guardianInfo.email}
                                      onChange={(e) =>
                                        handleTextChange(
                                          setGuardianInfo,
                                          "email",
                                          e.target.value,
                                          100,
                                        )
                                      }
                                      placeholder="email@example.com"
                                      maxLength={100}
                                      className="rounded-xl border-[#E2E8F0] focus-visible:ring-1 focus-visible:ring-[#0000CC] h-11 bg-white"
                                    />
                                  </Field>
                                  <Field
                                    label="Mobile"
                                    error={errors.guardianContact}
                                  >
                                    <Input
                                      type="tel"
                                      value={guardianInfo.contactNumber}
                                      onChange={(e) =>
                                        handleMobileChange(
                                          setGuardianInfo,
                                          "contactNumber",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="09XX XXX XXXX"
                                      maxLength={13}
                                      className="rounded-xl border-[#E2E8F0] focus-visible:ring-1 focus-visible:ring-[#0000CC] h-11 bg-white"
                                    />
                                  </Field>
                                </div>
                              </div>
                            )}

                            {!isGuardian && (
                              <div className="grid grid-cols-2 gap-3">
                                <Field
                                  label="Email"
                                  error={errors.studentEmail}
                                >
                                  <Input
                                    type="email"
                                    value={studentInfo.email}
                                    onChange={(e) =>
                                      handleTextChange(
                                        setStudentInfo,
                                        "email",
                                        e.target.value,
                                        100,
                                      )
                                    }
                                    placeholder="email@example.com"
                                    maxLength={100}
                                    className="rounded-xl border-[#E2E8F0] focus-visible:ring-1 focus-visible:ring-[#0000CC] focus-visible:border-[#0000CC] h-11"
                                  />
                                </Field>
                                <Field
                                  label="Mobile"
                                  error={errors.studentContact}
                                >
                                  <Input
                                    type="tel"
                                    value={studentInfo.contactNumber}
                                    onChange={(e) =>
                                      handleMobileChange(
                                        setStudentInfo,
                                        "contactNumber",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="09XX XXX XXXX"
                                    maxLength={13}
                                    className="rounded-xl border-[#E2E8F0] focus-visible:ring-1 focus-visible:ring-[#0000CC] focus-visible:border-[#0000CC] h-11"
                                  />
                                </Field>
                              </div>
                            )}
                          </div>
                        </div>
                      </form>
                    )}

                    {/* STEP 3: Success */}
                    {step === 3 && (
                      <div className="text-center">
                        <div className="w-14 h-14 bg-[#0000CC]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <CheckCircle2 className="w-7 h-7 text-[#0000CC]" />
                        </div>

                        {amount && department === "cashier" && (
                          <div className="mb-4">
                            <p
                              className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1"
                              style={{ fontFamily: "var(--font-geist-sans)" }}
                            >
                              Amount to Pay
                            </p>
                            <p
                              className="text-[24px] font-bold text-[#0000CC]"
                              style={{ fontFamily: "var(--font-geist-sans)" }}
                            >
                              ₱{amount}
                            </p>
                            <p
                              className="text-[12px] text-[#94A3B8] mt-1"
                              style={{ fontFamily: "var(--font-geist-sans)" }}
                            >
                              Please bring the exact amount
                            </p>
                          </div>
                        )}

                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl overflow-hidden mb-4">
                          <div className="bg-[#0000CC] px-6 py-2">
                            <p
                              className="text-[10px] font-bold uppercase tracking-widest text-white/70"
                              style={{ fontFamily: "var(--font-geist-sans)" }}
                            >
                              Your Ticket Number
                            </p>
                          </div>
                          <div className="py-5">
                            <p
                              className="text-[32px] font-bold text-[#0000CC] tracking-widest"
                              style={{ fontFamily: "var(--font-geist-sans)" }}
                            >
                              {ticketData?.ticketNumber || "---"}
                            </p>
                          </div>
                        </div>

                        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 mb-4">
                          <p
                            className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-2"
                            style={{ fontFamily: "var(--font-geist-sans)" }}
                          >
                            Contact Details
                          </p>
                          <div className="space-y-2 text-left">
                            {hasEmail && (
                              <div className="flex items-center gap-2">
                                <svg
                                  className="w-4 h-4 text-[#64748B] flex-shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                  />
                                </svg>
                                <p
                                  className="text-[13px] text-[#475569]"
                                  style={{
                                    fontFamily: "var(--font-geist-sans)",
                                  }}
                                >
                                  {isGuardian
                                    ? guardianInfo.email
                                    : studentInfo.email}
                                </p>
                              </div>
                            )}
                            {hasPhone && (
                              <div className="flex items-center gap-2">
                                <svg
                                  className="w-4 h-4 text-[#64748B] flex-shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                  />
                                </svg>
                                <p
                                  className="text-[13px] text-[#475569]"
                                  style={{
                                    fontFamily: "var(--font-geist-sans)",
                                  }}
                                >
                                  {isGuardian
                                    ? guardianInfo.contactNumber
                                    : studentInfo.contactNumber}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-[#F0F0FF] border border-[#0000CC]/10 rounded-xl p-4 mb-4">
                          <p
                            className="text-[13px] text-[#475569] leading-relaxed"
                            style={{ fontFamily: "var(--font-geist-sans)" }}
                          >
                            It's okay to close this — we've sent your ticket
                            number
                            {hasEmail && " to your email"}
                            {hasEmail && hasPhone && " and"}
                            {hasPhone && " via text"}
                            {!hasEmail && !hasPhone && " for your reference"}.
                            We'll notify you when it's your turn.
                          </p>
                        </div>

                        <AutoCloseCountdown onClose={handleClose} />

                        <div className="flex gap-3">
                          <button
                            onClick={handleClose}
                            className="flex-1 py-2.5 bg-[#0000CC] text-white text-[13px] font-semibold rounded-xl hover:bg-[#000099] transition-colors"
                          >
                            Done
                          </button>
                          <button
                            onClick={resetForm}
                            className="flex-1 py-2.5 border border-[#E2E8F0] text-[#475569] text-[13px] font-medium rounded-xl hover:bg-[#F8FAFC] transition-colors"
                          >
                            New ticket
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {step === 1 && formReady && (
                  <div className="flex-shrink-0 border-t border-gray-100 bg-white px-6 py-4 rounded-b-2xl">
                    <button
                      type="submit"
                      form="transaction-form"
                      disabled={
                        isSubmitting ||
                        (availability !== null &&
                          availability.status !== "open")
                      }
                      className="w-full py-3 text-[14px] font-semibold text-white rounded-xl bg-[#0000CC] hover:bg-[#000099] transition-colors disabled:opacity-50"
                    >
                      {isSubmitting
                        ? "Processing…"
                        : availability !== null &&
                            availability.status !== "open"
                          ? "Queue Unavailable"
                          : "Get My Ticket"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
