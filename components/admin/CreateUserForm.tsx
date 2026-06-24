// components/admin/CreateUserForm.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createStaffAccount } from "@/actions/staff";
import {
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Mail,
  User,
  ArrowLeft,
  Building2,
  GraduationCap,
  HandHeart,
  Wallet,
  Hash,
  LayoutGrid,
  Loader2,
  Copy,
  X,
  Key,
  Shield,
  UserCheck,
  Send,
} from "lucide-react";
import Link from "next/link";

type StaffRole = "registrar" | "dean" | "dsdw" | "cashier";

const STAFF_ROLES = [
  {
    value: "registrar" as StaffRole,
    label: "Registrar",
    description: "Manages student records, enrollment, and academic documents",
    icon: GraduationCap,
  },
  {
    value: "dean" as StaffRole,
    label: "Dean",
    description: "Oversees academic programs and faculty",
    icon: Building2,
  },
  {
    value: "dsdw" as StaffRole,
    label: "DSDW",
    description: "Student welfare and development services",
    icon: HandHeart,
  },
  {
    value: "cashier" as StaffRole,
    label: "Cashier",
    description: "Handles payments, assessments, and financial transactions",
    icon: Wallet,
  },
];

const CASHIER_WINDOWS = [
  { value: "1", label: "Window 1" },
  { value: "2", label: "Window 2" },
  { value: "3", label: "Window 3" },
  { value: "4", label: "Window 4" },
  { value: "5", label: "Window 5" },
];

interface StaffResult {
  staffId: string;
  facultyId: string;
  firstName: string;
  lastName: string;
  email: string;
  roleName: string;
}

const LOADING_STEPS = [
  { text: "Creating your account...", icon: UserPlus },
  { text: "Generating staff ID...", icon: Hash },
  { text: "Setting up credentials...", icon: Key },
  { text: "Configuring permissions...", icon: Shield },
  { text: "Sending welcome email...", icon: Send },
  { text: "Almost done...", icon: UserCheck },
];

export function CreateUserForm() {
  const [staffRole, setStaffRole] = useState<StaffRole | "">("");
  const [cashierWindow, setCashierWindow] = useState("");
  const [formData, setFormData] = useState({
    facultyId: "",
    firstName: "",
    lastName: "",
    email: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<StaffResult | null>(null);
  const [copied, setCopied] = useState(false);
  const loadingCompleteRef = useRef(false);

  const roleLabels: Record<string, string> = {
    registrar: "Registrar",
    dean: "Dean",
    dsdw: "DSDW",
    cashier: "Cashier",
  };

  // Cycle through loading steps - faster 800ms intervals
  useEffect(() => {
    if (!showLoadingModal) {
      setLoadingStep(0);
      loadingCompleteRef.current = false;
      return;
    }

    const interval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < LOADING_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 800); // Faster: 800ms per step

    return () => clearInterval(interval);
  }, [showLoadingModal]);

  // When request completes, quickly cycle to end and show success
  const completeLoadingAndShowSuccess = (data: StaffResult) => {
    loadingCompleteRef.current = true;

    // Jump to the last step immediately
    setLoadingStep(LOADING_STEPS.length - 1);

    // Short delay to show the final step, then switch to success
    setTimeout(() => {
      setShowLoadingModal(false);
      setSuccessData(data);
      setShowSuccessModal(true);
    }, 1000);
  };

  const updateField = (field: string, value: string) => {
    if (field === "facultyId") {
      value = value.replace(/\D/g, "").slice(0, 6);
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[field];
        return n;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!staffRole) newErrors.staffRole = "Please select a staff role";
    if (staffRole === "cashier" && !cashierWindow) {
      newErrors.cashierWindow = "Please assign a window number";
    }
    if (!formData.facultyId.trim()) {
      newErrors.facultyId = "Faculty ID is required";
    } else if (!/^\d{6}$/.test(formData.facultyId)) {
      newErrors.facultyId = "Faculty ID must be exactly 6 digits";
    }
    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setShowLoadingModal(true);
    loadingCompleteRef.current = false;

    try {
      const result = await createStaffAccount({
        facultyId: formData.facultyId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        roleName: staffRole as "registrar" | "dean" | "dsdw" | "cashier",
        roleAccessLevel: 6,
        cashierWindow: staffRole === "cashier" ? cashierWindow : undefined,
      });

      if (result.success && result.staff) {
        completeLoadingAndShowSuccess({
          staffId: result.staff.staffId,
          facultyId: result.staff.facultyId,
          firstName: result.staff.firstName,
          lastName: result.staff.lastName,
          email: result.staff.email,
          roleName: result.staff.roleName,
        });
        setStaffRole("");
        setCashierWindow("");
        setFormData({
          facultyId: "",
          firstName: "",
          lastName: "",
          email: "",
        });
      } else {
        setShowLoadingModal(false);
        setErrors({ submit: result.error || "Failed to create account" });
      }
    } catch (error) {
      setShowLoadingModal(false);
      setErrors({ submit: "An unexpected error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
    setCopied(false);
  };

  const handleCopyCredentials = () => {
    if (!successData) return;
    const text = [
      `Staff ID: ${successData.staffId}`,
      `Name: ${successData.firstName} ${successData.lastName}`,
      `Email: ${successData.email}`,
      `Role: ${roleLabels[successData.roleName]}`,
      `Faculty ID: ${successData.facultyId}`,
      `Password: Check email for temporary password`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const CurrentStepIcon = LOADING_STEPS[loadingStep].icon;

  const inputClass =
    "pl-10 h-11 border-gray-200 focus:border-[#1B5A8C] focus:ring-1 focus:ring-[#1B5A8C]/20 focus-visible:ring-1 focus-visible:ring-[#1B5A8C]/20";

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Staff Role Selection */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Select Staff Role
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Choose the role for the new staff account. A temporary password
              will be emailed automatically.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {STAFF_ROLES.map((role) => (
              <button
                key={role.value}
                type="button"
                onClick={() => {
                  setStaffRole(role.value);
                  if (role.value !== "cashier") setCashierWindow("");
                  setErrors((prev) => {
                    const n = { ...prev };
                    delete n.staffRole;
                    if (role.value !== "cashier") delete n.cashierWindow;
                    return n;
                  });
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                  staffRole === role.value
                    ? "bg-[#1B5A8C] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <role.icon
                  className={`w-5 h-5 flex-shrink-0 ${
                    staffRole === role.value ? "text-white" : "text-gray-500"
                  }`}
                />
                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold ${
                      staffRole === role.value ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {role.label}
                  </p>
                  <p
                    className={`text-xs mt-0.5 leading-relaxed hidden sm:block ${
                      staffRole === role.value
                        ? "text-white/70"
                        : "text-gray-500"
                    }`}
                  >
                    {role.description}
                  </p>
                </div>
                {staffRole === role.value && (
                  <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0 ml-auto" />
                )}
              </button>
            ))}
          </div>
          {errors.staffRole && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {errors.staffRole}
            </p>
          )}
        </div>

        {/* Cashier Window Assignment */}
        {staffRole === "cashier" && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Assign Window Number <span className="text-red-500">*</span>
            </Label>
            <Select
              value={cashierWindow}
              onValueChange={(value) => {
                setCashierWindow(value);
                if (errors.cashierWindow) {
                  setErrors((prev) => {
                    const n = { ...prev };
                    delete n.cashierWindow;
                    return n;
                  });
                }
              }}
            >
              <SelectTrigger className="h-11 border-gray-200 focus:ring-1 focus:ring-[#1B5A8C]/20">
                <LayoutGrid className="w-4 h-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Select window number" />
              </SelectTrigger>
              <SelectContent>
                {CASHIER_WINDOWS.map((window) => (
                  <SelectItem key={window.value} value={window.value}>
                    {window.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.cashierWindow && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.cashierWindow}
              </p>
            )}
          </div>
        )}

        <Separator />

        {/* Account Information */}
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Account Information
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Enter the staff member's details. A temporary password will be
              sent to their email.
            </p>
          </div>

          {/* Faculty ID */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Faculty ID <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={formData.facultyId}
                onChange={(e) => updateField("facultyId", e.target.value)}
                placeholder="000000"
                maxLength={6}
                className={inputClass}
              />
            </div>
            {errors.facultyId ? (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.facultyId}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {formData.facultyId.length > 0
                  ? `${formData.facultyId.length}/6 digits`
                  : "Enter 6-digit faculty ID number"}
              </p>
            )}
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                First Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={formData.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  placeholder="Enter first name"
                  className={inputClass}
                />
              </div>
              {errors.firstName && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.firstName}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={formData.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  placeholder="Enter last name"
                  className={inputClass}
                />
              </div>
              {errors.lastName && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.lastName}
                </p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="staff@example.com"
                className={inputClass}
              />
            </div>
            {errors.email ? (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.email}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Temporary password will be sent to this email
              </p>
            )}
          </div>
        </div>

        {/* Account Preview */}
        {staffRole && formData.firstName && formData.lastName && (
          <div className="p-4 bg-[#1B5A8C]/5 border border-[#1B5A8C]/10 rounded-xl">
            <p className="text-xs font-medium text-[#1B5A8C] mb-2 uppercase tracking-wide">
              Account Preview
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge className="bg-[#1B5A8C] text-white capitalize">
                {staffRole}
              </Badge>
              {staffRole === "cashier" && cashierWindow && (
                <Badge variant="secondary">Window {cashierWindow}</Badge>
              )}
              {formData.facultyId && (
                <Badge variant="outline" className="text-xs">
                  {formData.facultyId}
                </Badge>
              )}
              <span className="text-sm font-semibold text-gray-900">
                {formData.firstName} {formData.lastName}
              </span>
              {formData.email && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-sm text-muted-foreground">
                    {formData.email}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Mail className="w-3.5 h-3.5 text-[#1B5A8C]" />
              <p className="text-xs text-muted-foreground">
                A temporary password will be emailed to this address
              </p>
            </div>
          </div>
        )}

        {/* Submit Error */}
        {errors.submit && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex justify-between items-center">
          <Button type="button" variant="ghost" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Users
            </Link>
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className="bg-[#1B5A8C] hover:bg-[#0B3B5F] min-w-[200px]"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Create Staff Account
              </span>
            )}
          </Button>
        </div>
      </form>

      {/* Loading Modal */}
      {showLoadingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40"></div>
          <div className="relative bg-white rounded-xl w-full max-w-sm z-10 p-8">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <Loader2 className="w-10 h-10 text-[#1B5A8C] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <CurrentStepIcon className="w-4 h-4 text-[#1B5A8C]" />
                </div>
              </div>

              <h3 className="text-sm font-semibold text-gray-900 mb-3 transition-all duration-300">
                {LOADING_STEPS[loadingStep].text}
              </h3>

              <div className="flex items-center gap-1.5">
                {LOADING_STEPS.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === loadingStep
                        ? "bg-[#1B5A8C] w-5"
                        : index < loadingStep
                          ? "bg-[#1B5A8C]/30 w-1.5"
                          : "bg-gray-200 w-1.5"
                    }`}
                  />
                ))}
              </div>

              <p className="text-xs text-gray-400 mt-4">
                Please wait while we set up the account
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && successData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={handleCloseSuccess}
          ></div>

          <div className="relative bg-white rounded-xl w-full max-w-sm z-10 overflow-hidden">
            <button
              onClick={handleCloseSuccess}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 pt-8 pb-4 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-gray-900" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Account Created
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Staff account has been created successfully
              </p>
            </div>

            <div className="border-t border-gray-100"></div>

            <div className="px-6 py-4 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Staff ID</span>
                <span className="text-sm font-medium text-gray-900 font-mono">
                  {successData.staffId}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Name</span>
                <span className="text-sm font-medium text-gray-900">
                  {successData.firstName} {successData.lastName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Email</span>
                <span className="text-sm text-gray-900">
                  {successData.email}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Role</span>
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {roleLabels[successData.roleName] || successData.roleName}
                </span>
              </div>
            </div>

            <div className="mx-6 mb-5 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-2">
                <Mail className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-700 font-medium">
                    Temporary password sent
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    A temporary password has been sent to the staff member's
                    email.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-2">
              <button
                onClick={handleCopyCredentials}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-gray-900" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={handleCloseSuccess}
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
