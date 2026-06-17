// app/public/schedule/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/public/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  ChevronRight,
} from "lucide-react";

type TransactionType = "certificate" | "tor" | "grades" | "assessment";

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
    id: "certificate" as TransactionType,
    label: "Certificate of Enrollment",
    description: "Proof of current enrollment status",
    icon: FileText,
    requirements: "Valid School ID",
    time: "1-3 days",
  },
  {
    id: "tor" as TransactionType,
    label: "Transcript of Records",
    description: "Complete academic performance record",
    icon: ScrollText,
    requirements: "School ID, Clearance",
    time: "3-5 days",
  },
  {
    id: "grades" as TransactionType,
    label: "Request for Grades",
    description: "Official grade report per semester",
    icon: BarChart3,
    requirements: "Valid School ID",
    time: "1-2 days",
  },
  {
    id: "assessment" as TransactionType,
    label: "Request for Assessment",
    description: "Breakdown of fees and charges",
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

export default function GetTicketPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionType | null>(null);
  const [isGuardian, setIsGuardian] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedTransaction) {
      newErrors.transaction = "Please select a document or service";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};

    if (!studentInfo.schoolId.trim()) {
      newErrors.schoolId =
        "Please enter your school ID so we can pull up your records";
    } else if (!/^\d{2}-\d{4}-\d{3}$/.test(studentInfo.schoolId)) {
      newErrors.schoolId =
        "That doesn't look right. Use the format: XX-XXXX-XXX";
    }

    if (!studentInfo.firstName.trim())
      newErrors.firstName = "Please enter your first name";
    if (!studentInfo.lastName.trim())
      newErrors.lastName = "Please enter your last name";
    if (!studentInfo.year)
      newErrors.year =
        "Please select your year level so we know where to find you";
    if (!studentInfo.section) newErrors.section = "Please select your section";

    if (!isGuardian) {
      if (!studentInfo.email.trim() && !studentInfo.contactNumber.trim()) {
        newErrors.studentEmail =
          "Please provide either your email or contact number so we can reach you";
        newErrors.studentContact =
          "Please provide either your email or contact number so we can reach you";
      }
      if (
        studentInfo.email.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentInfo.email)
      ) {
        newErrors.studentEmail =
          "That email doesn't look right. Please check it again";
      }
      if (
        studentInfo.contactNumber.trim() &&
        !/^09\d{9}$/.test(studentInfo.contactNumber.replace(/\s/g, ""))
      ) {
        newErrors.studentContact =
          "Please enter a valid mobile number starting with 09";
      }
    }

    if (isGuardian) {
      if (!guardianInfo.guardianFirstName.trim())
        newErrors.guardianFirstName = "Please enter the guardian's first name";
      if (!guardianInfo.guardianLastName.trim())
        newErrors.guardianLastName = "Please enter the guardian's last name";
      if (!guardianInfo.relationship.trim())
        newErrors.relationship =
          "Please select your relationship to the student";

      if (!guardianInfo.email.trim() && !guardianInfo.contactNumber.trim()) {
        newErrors.guardianEmail =
          "Please provide either your email or contact number so we can reach you";
        newErrors.guardianContact =
          "Please provide either your email or contact number so we can reach you";
      }
      if (
        guardianInfo.email.trim() &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianInfo.email)
      ) {
        newErrors.guardianEmail =
          "That email doesn't look right. Please check it again";
      }
      if (
        guardianInfo.contactNumber.trim() &&
        !/^09\d{9}$/.test(guardianInfo.contactNumber.replace(/\s/g, ""))
      ) {
        newErrors.guardianContact =
          "Please enter a valid mobile number starting with 09";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setStep(3);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedTransaction(null);
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

  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <Header onLoginClick={() => console.log("Login clicked")} />

      <div className="pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-6 text-sm text-[#1B5A8C] hover:text-[#0B3B5F] transition-colors flex items-center gap-1 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#1B5A8C] tracking-tight mb-2">
              Get a Ticket
            </h1>
            <p className="text-sm text-gray-500">
              Request documents and services at Binalbagan Catholic College
            </p>
          </div>

          {/* Instructions */}
          <div className="mb-8 bg-[#1B5A8C]/5 border border-[#1B5A8C]/10 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-[#1B5A8C] mb-3">
              Here's how to get your ticket:
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-[#1B5A8C] text-white rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Pick a document
                  </p>
                  <p className="text-xs text-gray-500">Choose what you need</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Tell us about you
                  </p>
                  <p className="text-xs text-gray-500">Fill in your details</p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Get your number
                  </p>
                  <p className="text-xs text-gray-500">
                    We'll give you a ticket
                  </p>
                </div>
              </div>
            </div>
          </div>

          {step === 3 ? (
            // Ticket Confirmation
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-[#1B5A8C]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-[#1B5A8C]" />
              </div>
              <h2 className="text-xl font-bold text-[#1B5A8C] mb-1">
                Your ticket is ready!
              </h2>
              <p className="text-sm text-gray-600 mb-1">{selectedDoc?.label}</p>
              <p className="text-xs text-gray-500 mb-6">
                We'll send updates to{" "}
                {isGuardian
                  ? guardianInfo.email || guardianInfo.contactNumber
                  : studentInfo.email || studentInfo.contactNumber}
              </p>

              <div className="inline-block mb-8">
                <div className="bg-white border-2 border-[#1B5A8C]/20 rounded-xl overflow-hidden">
                  <div className="bg-[#1B5A8C] px-8 py-2.5">
                    <p className="text-white/80 text-xs font-medium">
                      YOUR TICKET NUMBER
                    </p>
                  </div>
                  <div className="px-10 py-5">
                    <p className="text-4xl font-bold text-[#1B5A8C] tracking-widest">
                      {String(Math.floor(Math.random() * 999) + 1).padStart(
                        3,
                        "0",
                      )}
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
            <>
              {/* Step 1: Select Document */}
              {step === 1 && (
                <div>
                  <div className="space-y-2">
                    {TRANSACTION_TYPES.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => {
                          setSelectedTransaction(type.id);
                          setErrors({});
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                          selectedTransaction === type.id
                            ? "border-[#1B5A8C] bg-[#1B5A8C]/5"
                            : "border-gray-200 hover:border-[#1B5A8C]/30 hover:bg-gray-50"
                        }`}
                      >
                        <div
                          className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                            selectedTransaction === type.id
                              ? "bg-[#1B5A8C] text-white"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          <type.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3
                              className={`text-sm font-medium ${selectedTransaction === type.id ? "text-[#1B5A8C]" : "text-gray-900"}`}
                            >
                              {type.label}
                            </h3>
                            <Badge variant="secondary" className="text-xs">
                              {type.time}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {type.description}
                          </p>
                        </div>
                        <div
                          className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedTransaction === type.id
                              ? "border-[#1B5A8C] bg-[#1B5A8C]"
                              : "border-gray-300"
                          }`}
                        >
                          {selectedTransaction === type.id && (
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  {errors.transaction && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      {errors.transaction}
                    </div>
                  )}
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => {
                        if (validateStep1()) setStep(2);
                      }}
                      className="inline-flex items-center px-6 py-2.5 bg-[#1B5A8C] text-white text-sm font-medium rounded-lg hover:bg-[#0B3B5F] transition-colors"
                    >
                      Continue
                      <ChevronRight className="w-4 h-4 ml-1.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Student Details */}
              {step === 2 && (
                <form onSubmit={handleSubmit}>
                  {selectedDoc && (
                    <div className="mb-5 p-3 bg-[#1B5A8C]/5 border border-[#1B5A8C]/10 rounded-lg flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-[#1B5A8C] rounded-lg flex items-center justify-center">
                        <selectedDoc.icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1B5A8C]">
                          {selectedDoc.label}
                        </p>
                        <p className="text-xs text-gray-500">
                          Requirements: {selectedDoc.requirements}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* School ID */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                        What's your school ID?{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={studentInfo.schoolId}
                        onChange={(e) => {
                          setStudentInfo((prev) => ({
                            ...prev,
                            schoolId: e.target.value,
                          }));
                          if (errors.schoolId)
                            setErrors((prev) => {
                              const n = { ...prev };
                              delete n.schoolId;
                              return n;
                            });
                        }}
                        placeholder="XX-XXXX-XXX"
                        maxLength={12}
                        className="focus-visible:ring-[#1B5A8C]"
                      />
                      {errors.schoolId && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.schoolId}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Format: YY-YYYY-NNN
                      </p>
                    </div>

                    {/* Name Fields */}
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
                            setStudentInfo((prev) => ({
                              ...prev,
                              suffix: value,
                            }))
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

                    {/* Year & Section */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                          Year level <span className="text-red-500">*</span>
                        </label>
                        <Select
                          value={studentInfo.year}
                          onValueChange={(value) => {
                            setStudentInfo((prev) => ({
                              ...prev,
                              year: value,
                            }));
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
                          <p className="text-xs text-red-600 mt-1">
                            {errors.year}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                          Section <span className="text-red-500">*</span>
                        </label>
                        <Select
                          value={studentInfo.section}
                          onValueChange={(value) => {
                            setStudentInfo((prev) => ({
                              ...prev,
                              section: value,
                            }));
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

                    {/* Student Contact Info */}
                    {!isGuardian && (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                        <div>
                          <h3 className="text-sm font-semibold text-[#1B5A8C] mb-1">
                            How can we reach you?
                          </h3>
                          <p className="text-xs text-gray-500 mb-3">
                            We'll send updates about your ticket here. Fill in
                            at least one.
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-[#1B5A8C]" />
                              Email
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
                              placeholder="Enter email address"
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
                              <Phone className="w-3.5 h-3.5 text-[#1B5A8C]" />
                              Mobile number
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

                    {/* Guardian Checkbox */}
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
                        <div className="grid gap-0.5 leading-none">
                          <label
                            htmlFor="guardian"
                            className="text-sm font-medium text-gray-900 cursor-pointer"
                          >
                            A guardian or parent is processing this request
                          </label>
                          <p className="text-xs text-gray-500">
                            Check this if you're a parent or guardian requesting
                            on behalf of the student
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Guardian Fields */}
                    {isGuardian && (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                        <h3 className="text-sm font-semibold text-[#1B5A8C]">
                          Tell us about you (Guardian/Parent)
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
                              placeholder="Enter first name"
                              className="focus-visible:ring-[#1B5A8C]"
                            />
                            {errors.guardianFirstName && (
                              <p className="text-xs text-red-600 mt-1">
                                {errors.guardianFirstName}
                              </p>
                            )}
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
                              placeholder="Enter last name"
                              className="focus-visible:ring-[#1B5A8C]"
                            />
                            {errors.guardianLastName && (
                              <p className="text-xs text-red-600 mt-1">
                                {errors.guardianLastName}
                              </p>
                            )}
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
                              placeholder="Enter middle name"
                              className="focus-visible:ring-[#1B5A8C]"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-700 mb-1 block">
                              Relationship to student{" "}
                              <span className="text-red-500">*</span>
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
                                <SelectValue placeholder="Select relationship" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Father">Father</SelectItem>
                                <SelectItem value="Mother">Mother</SelectItem>
                                <SelectItem value="Guardian">
                                  Guardian
                                </SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            {errors.relationship && (
                              <p className="text-xs text-red-600 mt-1">
                                {errors.relationship}
                              </p>
                            )}
                          </div>
                        </div>

                        <Separator className="bg-gray-200" />

                        <div>
                          <h3 className="text-sm font-semibold text-[#1B5A8C] mb-1">
                            How can we reach you?
                          </h3>
                          <p className="text-xs text-gray-500 mb-3">
                            We'll send updates about the ticket here. Fill in at
                            least one.
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-[#1B5A8C]" />
                              Email
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
                              placeholder="Enter email address"
                              className="focus-visible:ring-[#1B5A8C]"
                            />
                            {errors.guardianEmail && (
                              <p className="text-xs text-red-600 mt-1">
                                {errors.guardianEmail}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-[#1B5A8C]" />
                              Mobile number
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
                            {errors.guardianContact && (
                              <p className="text-xs text-red-600 mt-1">
                                {errors.guardianContact}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator className="my-6 bg-gray-200" />

                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-sm font-medium text-[#1B5A8C] hover:text-[#0B3B5F] transition-colors flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center px-6 py-2.5 bg-[#1B5A8C] text-white text-sm font-medium rounded-lg hover:bg-[#0B3B5F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting
                        ? "Getting your ticket..."
                        : "Get My Ticket"}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
