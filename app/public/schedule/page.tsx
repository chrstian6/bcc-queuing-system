// app/public/schedule/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/public/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  FileText,
  ScrollText,
  BarChart3,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  FileCheck,
  ClipboardList,
  GraduationCap,
} from "lucide-react";
import { createTicket } from "@/actions/ticket";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

interface StudentInfo {
  schoolId: string;
  firstName: string;
  lastName: string;
  middleName: string;
  suffix: string;
  year: string;
  section: string;
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

const TRANSACTION_TYPES = [
  {
    id: "tor",
    label: "Request for TOR",
    description: "Transcript of Records - official academic record",
    icon: ScrollText,
    requirements: "Valid School ID, Clearance",
    time: "3-5 days",
  },
  {
    id: "coe",
    label: "Request for COE",
    description: "Certificate of Enrollment - proof of enrollment",
    icon: FileCheck,
    requirements: "Valid School ID",
    time: "1-3 days",
  },
  {
    id: "request-grades",
    label: "Request for Grades",
    description: "Official grade report per semester or term",
    icon: BarChart3,
    requirements: "Valid School ID",
    time: "1-2 days",
  },
  {
    id: "enrollment-fees",
    label: "Enrollment Fees",
    description: "Payment for enrollment and registration fees",
    icon: GraduationCap,
    requirements: "Valid School ID",
    time: "Same day",
  },
  {
    id: "assessment",
    label: "Request Assessment",
    description: "Request breakdown of fees, charges, and balances",
    icon: ClipboardList,
    requirements: "Valid School ID",
    time: "Same day",
  },
  {
    id: "exam-fees",
    label: "Exam Fees",
    description: "Payment for examination-related fees and permits",
    icon: FileText,
    requirements: "Valid School ID",
    time: "Same day",
  },
  {
    id: "payments",
    label: "Payments",
    description: "General payments for tuition, miscellaneous, and other fees",
    icon: Receipt,
    requirements: "Valid School ID",
    time: "Same day",
  },
];

const YEAR_LEVELS = [
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

const SECTIONS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const SUFFIXES = ["", "Jr.", "Sr.", "II", "III", "IV", "V"];

function ScheduleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const transactionType = searchParams.get("type");

  const [step, setStep] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(
    null,
  );
  const [isGuardian, setIsGuardian] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketData, setTicketData] = useState<{
    ticketNumber: string;
    ticketId: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string>("");

  const [studentInfo, setStudentInfo] = useState<StudentInfo>({
    schoolId: "",
    firstName: "",
    lastName: "",
    middleName: "",
    suffix: "",
    year: "",
    section: "",
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

  useEffect(() => {
    if (transactionType) {
      setSelectedTransaction(transactionType);
      setStep(2);
    }
  }, [transactionType]);

  const handleSchoolIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 6) {
      setStudentInfo((prev) => ({ ...prev, schoolId: value }));
      if (errors.schoolId) {
        setErrors((prev) => {
          const n = { ...prev };
          delete n.schoolId;
          return n;
        });
      }
    }
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!studentInfo.schoolId.trim())
      newErrors.schoolId = "Please enter your school ID";
    else if (!/^\d{6}$/.test(studentInfo.schoolId))
      newErrors.schoolId = "Please enter a valid 6-digit school ID";
    if (!studentInfo.firstName.trim())
      newErrors.firstName = "Please enter your first name";
    if (!studentInfo.lastName.trim())
      newErrors.lastName = "Please enter your last name";
    if (!studentInfo.year) newErrors.year = "Please select your year level";
    if (!studentInfo.section) newErrors.section = "Please select your section";

    if (!isGuardian) {
      if (!studentInfo.email.trim() && !studentInfo.contactNumber.trim()) {
        newErrors.studentEmail = "Please provide email or contact number";
        newErrors.studentContact = "Please provide email or contact number";
      }
      if (
        studentInfo.email.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentInfo.email)
      ) {
        newErrors.studentEmail = "Invalid email address";
      }
      if (
        studentInfo.contactNumber.trim() &&
        !/^09\d{9}$/.test(studentInfo.contactNumber.replace(/\s/g, ""))
      ) {
        newErrors.studentContact = "Invalid mobile number";
      }
    }

    if (isGuardian) {
      if (!guardianInfo.guardianFirstName.trim())
        newErrors.guardianFirstName = "Required";
      if (!guardianInfo.guardianLastName.trim())
        newErrors.guardianLastName = "Required";
      if (!guardianInfo.relationship.trim())
        newErrors.relationship = "Required";
      if (!guardianInfo.email.trim() && !guardianInfo.contactNumber.trim()) {
        newErrors.guardianEmail = "Please provide email or contact number";
        newErrors.guardianContact = "Please provide email or contact number";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!validateStep2()) return;
    setIsSubmitting(true);
    try {
      const result = await createTicket({
        transactionType: selectedTransaction!,
        student: {
          schoolId: studentInfo.schoolId,
          firstName: studentInfo.firstName,
          lastName: studentInfo.lastName,
          middleName: studentInfo.middleName || undefined,
          suffix: studentInfo.suffix || undefined,
          year: studentInfo.year,
          section: studentInfo.section,
        },
        requesterType: isGuardian ? "guardian" : "student",
        requesterEmail: isGuardian
          ? guardianInfo.email || undefined
          : studentInfo.email || undefined,
        requesterContactNumber: isGuardian
          ? guardianInfo.contactNumber || undefined
          : studentInfo.contactNumber || undefined,
        guardian: isGuardian
          ? {
              firstName: guardianInfo.guardianFirstName,
              lastName: guardianInfo.guardianLastName,
              middleName: guardianInfo.guardianMiddleName || undefined,
              relationship: guardianInfo.relationship,
            }
          : undefined,
      });

      if (result.success && result.ticket) {
        setTicketData({
          ticketNumber: result.ticket.ticketNumber,
          ticketId: result.ticket.ticketId,
        });
        setStep(3);
      } else {
        setSubmitError(
          result.error || "Failed to create ticket. Please try again.",
        );
      }
    } catch (error) {
      setSubmitError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(2);
    setTicketData(null);
    setSubmitError("");
    setStudentInfo({
      schoolId: "",
      firstName: "",
      lastName: "",
      middleName: "",
      suffix: "",
      year: "",
      section: "",
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
  };

  const selectedDoc = TRANSACTION_TYPES.find(
    (t) => t.id === selectedTransaction,
  );

  if (!transactionType) {
    return (
      <div
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-white flex items-center justify-center`}
        style={{ fontFamily: "var(--font-geist-sans)" }}
      >
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">No transaction type selected</p>
          <Link
            href="/"
            className="text-[#1B5A8C] hover:text-[#0B3B5F] font-medium"
          >
            Go back to select a transaction
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-white`}
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <Header onLoginClick={() => console.log("Login clicked")} />
      <div className="pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => router.back()}
            className="mb-6 text-sm text-[#1B5A8C] hover:text-[#0B3B5F] transition-colors flex items-center gap-1 font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#1B5A8C] tracking-tight mb-2">
              Fill Out Your Details
            </h1>
            <p className="text-sm text-gray-500">
              Complete the form below to get your ticket
            </p>
          </div>

          {step === 3 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-[#1B5A8C]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-[#1B5A8C]" />
              </div>
              <h2 className="text-xl font-bold text-[#1B5A8C] mb-1">
                Your ticket is ready!
              </h2>
              <p className="text-sm text-gray-600 mb-1">{selectedDoc?.label}</p>
              <div className="inline-block mb-8">
                <div className="bg-white border-2 border-[#1B5A8C]/20 rounded-xl overflow-hidden">
                  <div className="bg-[#1B5A8C] px-8 py-2.5">
                    <p className="text-white/80 text-xs font-medium">
                      YOUR TICKET NUMBER
                    </p>
                  </div>
                  <div className="px-10 py-5">
                    <p
                      className="text-4xl font-bold text-[#1B5A8C] tracking-widest"
                      style={{ fontFamily: "var(--font-geist-mono)" }}
                    >
                      {ticketData?.ticketNumber || "---"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-center">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center px-6 py-2.5 bg-[#1B5A8C] text-white text-sm font-medium rounded-lg hover:bg-[#0B3B5F] transition-colors"
                >
                  Done
                </Link>
                <button
                  onClick={handleReset}
                  className="inline-flex items-center justify-center px-6 py-2.5 border border-[#1B5A8C]/20 text-[#1B5A8C] text-sm font-medium rounded-lg hover:bg-[#1B5A8C]/5 transition-colors"
                >
                  Get Another Ticket
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {selectedDoc && (
                <div className="mb-5 p-3 bg-[#1B5A8C]/5 border border-[#1B5A8C]/10 rounded-lg flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-[#1B5A8C] rounded-lg flex items-center justify-center">
                    <selectedDoc.icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#1B5A8C]">
                      {selectedDoc.label}
                    </p>
                    <p className="text-xs text-gray-500">
                      Requirements: {selectedDoc.requirements}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {selectedDoc.time}
                  </Badge>
                </div>
              )}
              {submitError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-600">{submitError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                    School ID <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={studentInfo.schoolId}
                    onChange={handleSchoolIdChange}
                    placeholder="Enter 6-digit school ID"
                    maxLength={6}
                    className="focus-visible:ring-[#1B5A8C]"
                  />
                  {errors.schoolId && (
                    <p className="text-xs text-red-600 mt-1">
                      {errors.schoolId}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      First name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={studentInfo.firstName}
                      onChange={(e) => {
                        setStudentInfo((prev) => ({
                          ...prev,
                          firstName: e.target.value,
                        }));
                        if (errors.firstName)
                          setErrors((prev) => {
                            const n = { ...prev };
                            delete n.firstName;
                            return n;
                          });
                      }}
                      placeholder="Enter first name"
                      className="focus-visible:ring-[#1B5A8C]"
                    />
                    {errors.firstName && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.firstName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      Last name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={studentInfo.lastName}
                      onChange={(e) => {
                        setStudentInfo((prev) => ({
                          ...prev,
                          lastName: e.target.value,
                        }));
                        if (errors.lastName)
                          setErrors((prev) => {
                            const n = { ...prev };
                            delete n.lastName;
                            return n;
                          });
                      }}
                      placeholder="Enter last name"
                      className="focus-visible:ring-[#1B5A8C]"
                    />
                    {errors.lastName && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      Middle name
                    </label>
                    <Input
                      value={studentInfo.middleName}
                      onChange={(e) =>
                        setStudentInfo((prev) => ({
                          ...prev,
                          middleName: e.target.value,
                        }))
                      }
                      placeholder="Enter middle name"
                      className="focus-visible:ring-[#1B5A8C]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      Suffix
                    </label>
                    <Select
                      value={studentInfo.suffix}
                      onValueChange={(value) =>
                        setStudentInfo((prev) => ({ ...prev, suffix: value }))
                      }
                    >
                      <SelectTrigger className="focus:ring-[#1B5A8C]">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUFFIXES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s || "None"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      Year level <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={studentInfo.year}
                      onValueChange={(value) => {
                        setStudentInfo((prev) => ({ ...prev, year: value }));
                        if (errors.year)
                          setErrors((prev) => {
                            const n = { ...prev };
                            delete n.year;
                            return n;
                          });
                      }}
                    >
                      <SelectTrigger className="focus:ring-[#1B5A8C]">
                        <SelectValue placeholder="Select year level" />
                      </SelectTrigger>
                      <SelectContent>
                        {YEAR_LEVELS.map((y) => (
                          <SelectItem key={y} value={y}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.year && (
                      <p className="text-xs text-red-600 mt-1">{errors.year}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      Section <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={studentInfo.section}
                      onValueChange={(value) => {
                        setStudentInfo((prev) => ({ ...prev, section: value }));
                        if (errors.section)
                          setErrors((prev) => {
                            const n = { ...prev };
                            delete n.section;
                            return n;
                          });
                      }}
                    >
                      <SelectTrigger className="focus:ring-[#1B5A8C]">
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            Section {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.section && (
                      <p className="text-xs text-red-600 mt-1">
                        {errors.section}
                      </p>
                    )}
                  </div>
                </div>

                {!isGuardian && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                    <h3 className="text-sm font-semibold text-[#1B5A8C]">
                      How can we reach you?
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-[#1B5A8C]" /> Email
                        </label>
                        <Input
                          type="email"
                          value={studentInfo.email}
                          onChange={(e) => {
                            setStudentInfo((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }));
                            if (errors.studentEmail)
                              setErrors((prev) => {
                                const n = { ...prev };
                                delete n.studentEmail;
                                return n;
                              });
                          }}
                          placeholder="Enter email"
                          className="focus-visible:ring-[#1B5A8C]"
                        />
                        {errors.studentEmail && (
                          <p className="text-xs text-red-600 mt-1">
                            {errors.studentEmail}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-[#1B5A8C]" />{" "}
                          Mobile
                        </label>
                        <Input
                          type="tel"
                          value={studentInfo.contactNumber}
                          onChange={(e) => {
                            setStudentInfo((prev) => ({
                              ...prev,
                              contactNumber: e.target.value,
                            }));
                            if (errors.studentContact)
                              setErrors((prev) => {
                                const n = { ...prev };
                                delete n.studentContact;
                                return n;
                              });
                          }}
                          placeholder="09XXXXXXXXX"
                          className="focus-visible:ring-[#1B5A8C]"
                        />
                        {errors.studentContact && (
                          <p className="text-xs text-red-600 mt-1">
                            {errors.studentContact}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id="guardian"
                      checked={isGuardian}
                      onCheckedChange={(checked) =>
                        setIsGuardian(checked === true)
                      }
                      className="border-gray-300 data-[state=checked]:bg-[#1B5A8C] data-[state=checked]:border-[#1B5A8C]"
                    />
                    <div>
                      <label
                        htmlFor="guardian"
                        className="text-sm font-medium text-gray-900 cursor-pointer"
                      >
                        A guardian or parent is processing this request
                      </label>
                      <p className="text-xs text-gray-500">
                        Check if you're a parent/guardian requesting for the
                        student
                      </p>
                    </div>
                  </div>
                </div>

                {isGuardian && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                    <h3 className="text-sm font-semibold text-[#1B5A8C]">
                      Guardian Information
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">
                          First name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={guardianInfo.guardianFirstName}
                          onChange={(e) => {
                            setGuardianInfo((prev) => ({
                              ...prev,
                              guardianFirstName: e.target.value,
                            }));
                            if (errors.guardianFirstName)
                              setErrors((prev) => {
                                const n = { ...prev };
                                delete n.guardianFirstName;
                                return n;
                              });
                          }}
                          placeholder="First name"
                          className="focus-visible:ring-[#1B5A8C]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">
                          Last name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          value={guardianInfo.guardianLastName}
                          onChange={(e) => {
                            setGuardianInfo((prev) => ({
                              ...prev,
                              guardianLastName: e.target.value,
                            }));
                            if (errors.guardianLastName)
                              setErrors((prev) => {
                                const n = { ...prev };
                                delete n.guardianLastName;
                                return n;
                              });
                          }}
                          placeholder="Last name"
                          className="focus-visible:ring-[#1B5A8C]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">
                          Middle name
                        </label>
                        <Input
                          value={guardianInfo.guardianMiddleName}
                          onChange={(e) =>
                            setGuardianInfo((prev) => ({
                              ...prev,
                              guardianMiddleName: e.target.value,
                            }))
                          }
                          placeholder="Middle name"
                          className="focus-visible:ring-[#1B5A8C]"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">
                          Relationship <span className="text-red-500">*</span>
                        </label>
                        <Select
                          value={guardianInfo.relationship}
                          onValueChange={(value) => {
                            setGuardianInfo((prev) => ({
                              ...prev,
                              relationship: value,
                            }));
                            if (errors.relationship)
                              setErrors((prev) => {
                                const n = { ...prev };
                                delete n.relationship;
                                return n;
                              });
                          }}
                        >
                          <SelectTrigger className="focus:ring-[#1B5A8C]">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Father">Father</SelectItem>
                            <SelectItem value="Mother">Mother</SelectItem>
                            <SelectItem value="Guardian">Guardian</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-[#1B5A8C]" /> Email
                        </label>
                        <Input
                          type="email"
                          value={guardianInfo.email}
                          onChange={(e) => {
                            setGuardianInfo((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }));
                            if (errors.guardianEmail)
                              setErrors((prev) => {
                                const n = { ...prev };
                                delete n.guardianEmail;
                                return n;
                              });
                          }}
                          placeholder="Email"
                          className="focus-visible:ring-[#1B5A8C]"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-[#1B5A8C]" />{" "}
                          Mobile
                        </label>
                        <Input
                          type="tel"
                          value={guardianInfo.contactNumber}
                          onChange={(e) => {
                            setGuardianInfo((prev) => ({
                              ...prev,
                              contactNumber: e.target.value,
                            }));
                            if (errors.guardianContact)
                              setErrors((prev) => {
                                const n = { ...prev };
                                delete n.guardianContact;
                                return n;
                              });
                          }}
                          placeholder="09XXXXXXXXX"
                          className="focus-visible:ring-[#1B5A8C]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-6 bg-gray-200" />

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="text-sm font-medium text-[#1B5A8C] hover:text-[#0B3B5F] transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Change Transaction
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-6 py-2.5 bg-[#1B5A8C] text-white text-sm font-medium rounded-lg hover:bg-[#0B3B5F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Getting your ticket..." : "Get My Ticket"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GetTicketPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-[#1B5A8C] rounded-full animate-spin" />
        </div>
      }
    >
      <ScheduleContent />
    </Suspense>
  );
}
