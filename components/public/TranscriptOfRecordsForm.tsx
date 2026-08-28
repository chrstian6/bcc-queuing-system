// components/public/TranscriptOfRecordsForm.tsx
"use client";

import { useState } from "react";
import { Briefcase, User, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const CAV_FEE = 80;
const AUTH_OTR_FEE = 30;
const OTR_FEE = 300;

export interface TorFormData {
  purpose: {
    employment: boolean;
    employmentScope: "local" | "abroad";
    cavChed: boolean;
    cavScope: "local" | "abroad";
    boardExam: boolean;
    boardExamType: "cpa" | "let" | "other";
    boardExamOther: string;
  };
  student: {
    lastName: string;
    firstName: string;
    middleName: string;
    birthdate: string;
    birthplace: string;
    gender: "male" | "female";
    address: string;
    contactNo: string;
  };
  academic: {
    course: string;
    major: string;
    yearGraduated: string;
    notGraduated: boolean;
    semester: "1st" | "2nd" | "Summer";
    schoolYear: string;
  };
  fee: number;
}

interface TranscriptOfRecordsFormProps {
  onSubmit: (data: TorFormData) => void;
  onCancel?: () => void;
}

type PurposeState = {
  employment: boolean;
  employmentScope: "local" | "abroad";
  cavChed: boolean;
  cavScope: "local" | "abroad";
  boardExam: boolean;
  boardExamType: "cpa" | "let" | "other";
  boardExamOther: string;
};

type StudentState = {
  lastName: string;
  firstName: string;
  middleName: string;
  birthdate: string;
  birthplace: string;
  gender: "male" | "female";
  address: string;
  contactNo: string;
};

type AcademicState = {
  course: string;
  major: string;
  yearGraduated: string;
  notGraduated: boolean;
  semester: "1st" | "2nd" | "Summer";
  schoolYear: string;
};

const initialPurpose: PurposeState = {
  employment: false,
  employmentScope: "local",
  cavChed: false,
  cavScope: "local",
  boardExam: false,
  boardExamType: "cpa",
  boardExamOther: "",
};

export default function TranscriptOfRecordsForm({
  onSubmit,
  onCancel,
}: TranscriptOfRecordsFormProps) {
  const [purpose, setPurpose] = useState<PurposeState>(initialPurpose);
  const [student, setStudent] = useState<StudentState>({
    lastName: "",
    firstName: "",
    middleName: "",
    birthdate: "",
    birthplace: "",
    gender: "male",
    address: "",
    contactNo: "",
  });
  const [academic, setAcademic] = useState<AcademicState>({
    course: "",
    major: "",
    yearGraduated: "",
    notGraduated: false,
    semester: "1st",
    schoolYear: "",
  });

  const updatePurpose = (patch: Partial<PurposeState>) =>
    setPurpose((p) => ({ ...p, ...patch }));
  const updateStudent = (key: keyof StudentState, value: string) =>
    setStudent((s) => ({ ...s, [key]: value }));
  const updateAcademic = (key: keyof AcademicState, value: string | boolean) =>
    setAcademic((a) => ({ ...a, [key]: value }));

  const estimatedFee = OTR_FEE + (purpose.cavChed ? CAV_FEE + AUTH_OTR_FEE : 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ purpose, student, academic, fee: estimatedFee });
  };

  const labelStyle = { fontFamily: "var(--font-geist-sans)" };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3
          className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0F172A]"
          style={labelStyle}
        >
          <Briefcase className="h-4 w-4 text-[#0000CC]" />
          Purpose
        </h3>

        <div className="space-y-3 rounded-xl border border-gray-200 bg-[#F8FAFC] p-4">
          {/* Employment Purposes */}
          <div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="employment"
                checked={purpose.employment}
                onCheckedChange={(v) =>
                  updatePurpose({ employment: v === true })
                }
              />
              <Label
                htmlFor="employment"
                className="text-sm text-[#0F172A]"
                style={labelStyle}
              >
                Employment Purposes
              </Label>
            </div>
            {purpose.employment && (
              <RadioGroup
                value={purpose.employmentScope}
                onValueChange={(v: string) =>
                  updatePurpose({ employmentScope: v as "local" | "abroad" })
                }
                className="ml-6 mt-2 flex gap-4"
              >
                {(["local", "abroad"] as const).map((scope) => (
                  <div key={scope} className="flex items-center gap-1.5">
                    <RadioGroupItem value={scope} id={`employment-${scope}`} />
                    <Label
                      htmlFor={`employment-${scope}`}
                      className="text-sm capitalize text-gray-600"
                      style={labelStyle}
                    >
                      {scope}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          {/* CAV-CHED */}
          <div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="cavChed"
                checked={purpose.cavChed}
                onCheckedChange={(v) => updatePurpose({ cavChed: v === true })}
              />
              <Label
                htmlFor="cavChed"
                className="text-sm text-[#0F172A]"
                style={labelStyle}
              >
                CAV-CHED (Red Ribbon)
              </Label>
            </div>
            {purpose.cavChed && (
              <RadioGroup
                value={purpose.cavScope}
                onValueChange={(v: string) =>
                  updatePurpose({ cavScope: v as "local" | "abroad" })
                }
                className="ml-6 mt-2 flex gap-4"
              >
                {(["local", "abroad"] as const).map((scope) => (
                  <div key={scope} className="flex items-center gap-1.5">
                    <RadioGroupItem value={scope} id={`cav-${scope}`} />
                    <Label
                      htmlFor={`cav-${scope}`}
                      className="text-sm capitalize text-gray-600"
                      style={labelStyle}
                    >
                      {scope}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          {/* Board Exam */}
          <div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="boardExam"
                checked={purpose.boardExam}
                onCheckedChange={(v) =>
                  updatePurpose({ boardExam: v === true })
                }
              />
              <Label
                htmlFor="boardExam"
                className="text-sm text-[#0F172A]"
                style={labelStyle}
              >
                Board Exam
              </Label>
            </div>
            {purpose.boardExam && (
              <div className="ml-6 mt-2 flex flex-wrap items-center gap-4">
                <RadioGroup
                  value={purpose.boardExamType}
                  onValueChange={(v: string) =>
                    updatePurpose({
                      boardExamType: v as "cpa" | "let" | "other",
                    })
                  }
                  className="flex gap-4"
                >
                  {[
                    { id: "cpa", label: "CPA" },
                    { id: "let", label: "LET" },
                    { id: "other", label: "Others" },
                  ].map((opt) => (
                    <div key={opt.id} className="flex items-center gap-1.5">
                      <RadioGroupItem value={opt.id} id={`board-${opt.id}`} />
                      <Label
                        htmlFor={`board-${opt.id}`}
                        className="text-sm text-gray-600"
                        style={labelStyle}
                      >
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {purpose.boardExamType === "other" && (
                  <Input
                    placeholder="Please indicate"
                    value={purpose.boardExamOther}
                    onChange={(e) =>
                      updatePurpose({ boardExamOther: e.target.value })
                    }
                    className="h-8 w-40 text-sm"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student's Personal Information */}
      <div>
        <h3
          className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0F172A]"
          style={labelStyle}
        >
          <User className="h-4 w-4 text-[#0000CC]" />
          Student&apos;s Personal Information
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            label="Last Name"
            required
            value={student.lastName}
            onChange={(v) => updateStudent("lastName", v)}
          />
          <FormField
            label="First Name"
            required
            value={student.firstName}
            onChange={(v) => updateStudent("firstName", v)}
          />
          <FormField
            label="Middle Name"
            value={student.middleName}
            onChange={(v) => updateStudent("middleName", v)}
          />
          <FormField
            label="Birthdate"
            type="date"
            value={student.birthdate}
            onChange={(v) => updateStudent("birthdate", v)}
          />
          <FormField
            label="Birthplace"
            value={student.birthplace}
            onChange={(v) => updateStudent("birthplace", v)}
          />
          <div>
            <Label
              className="mb-1.5 block text-xs font-medium text-gray-500"
              style={labelStyle}
            >
              Gender
            </Label>
            <RadioGroup
              value={student.gender}
              onValueChange={(v: string) => updateStudent("gender", v)}
              className="flex gap-4 pt-1.5"
            >
              {(["male", "female"] as const).map((g) => (
                <div key={g} className="flex items-center gap-1.5">
                  <RadioGroupItem value={g} id={`gender-${g}`} />
                  <Label
                    htmlFor={`gender-${g}`}
                    className="text-sm capitalize text-gray-600"
                    style={labelStyle}
                  >
                    {g}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <FormField
            label="Address"
            value={student.address}
            onChange={(v) => updateStudent("address", v)}
            className="sm:col-span-2"
          />
          <FormField
            label="Contact No."
            value={student.contactNo}
            onChange={(v) => updateStudent("contactNo", v)}
          />
        </div>
      </div>

      {/* Academic Information */}
      <div>
        <h3
          className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0F172A]"
          style={labelStyle}
        >
          <GraduationCap className="h-4 w-4 text-[#0000CC]" />
          Academic Information
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            label="Course"
            required
            value={academic.course}
            onChange={(v) => updateAcademic("course", v)}
          />
          <FormField
            label="Major"
            value={academic.major}
            onChange={(v) => updateAcademic("major", v)}
          />
          <FormField
            label="Year Graduated"
            value={academic.yearGraduated}
            onChange={(v) => updateAcademic("yearGraduated", v)}
            disabled={academic.notGraduated}
          />
          <div className="flex items-end gap-2 pb-2">
            <Checkbox
              id="notGraduated"
              checked={academic.notGraduated}
              onCheckedChange={(v) =>
                updateAcademic("notGraduated", v === true)
              }
            />
            <Label
              htmlFor="notGraduated"
              className="text-sm text-gray-600"
              style={labelStyle}
            >
              Not yet graduated
            </Label>
          </div>

          {academic.notGraduated && (
            <>
              <div>
                <Label
                  className="mb-1.5 block text-xs font-medium text-gray-500"
                  style={labelStyle}
                >
                  Last Semester Attended
                </Label>
                <RadioGroup
                  value={academic.semester}
                  onValueChange={(v: string) => updateAcademic("semester", v)}
                  className="flex gap-4 pt-1.5"
                >
                  {(["1st", "2nd", "Summer"] as const).map((sem) => (
                    <div key={sem} className="flex items-center gap-1.5">
                      <RadioGroupItem value={sem} id={`sem-${sem}`} />
                      <Label
                        htmlFor={`sem-${sem}`}
                        className="text-sm text-gray-600"
                        style={labelStyle}
                      >
                        {sem}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <FormField
                label="School Year"
                placeholder="e.g. 2023-2024"
                value={academic.schoolYear}
                onChange={(v) => updateAcademic("schoolYear", v)}
              />
            </>
          )}
        </div>
      </div>

      {/* Fee summary */}
      <div className="flex items-center justify-between rounded-xl bg-[#F8FAFC] px-4 py-3">
        <div style={labelStyle}>
          <p className="text-sm font-medium text-[#0F172A]">
            OTR (for Employment)
          </p>
          {purpose.cavChed && (
            <p className="text-xs text-gray-500">
              + CAV authentication (₱{CAV_FEE}) + OTR authentication (₱
              {AUTH_OTR_FEE}/set)
            </p>
          )}
        </div>
        <p className="text-lg font-bold text-[#0000CC]" style={labelStyle}>
          ₱{estimatedFee}.00
        </p>
      </div>

      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
            style={labelStyle}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="flex-1 rounded-xl bg-[#0000CC] py-2.5 text-sm font-semibold text-white transition hover:bg-[#0000AA]"
          style={labelStyle}
        >
          Submit Request
        </button>
      </div>
    </form>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  required,
  disabled,
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label
        className="mb-1.5 block text-xs font-medium text-gray-500"
        style={{ fontFamily: "var(--font-geist-sans)" }}
      >
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </Label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm"
      />
    </div>
  );
}
