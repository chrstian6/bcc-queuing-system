// components/admin/CreateUserForm.tsx
"use client";

import { useState } from "react";
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
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdStaffId, setCreatedStaffId] = useState("");

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

      if (result.success) {
        setCreatedStaffId(result.staff?.staffId || "");
        setIsSuccess(true);
      } else {
        setErrors({ submit: result.error || "Failed to create account" });
      }
    } catch (error) {
      setErrors({ submit: "An unexpected error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-12 space-y-6">
        <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Staff Account Created!
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            {formData.firstName} {formData.lastName}
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge className="capitalize">{staffRole}</Badge>
            {staffRole === "cashier" && cashierWindow && (
              <Badge variant="secondary">Window {cashierWindow}</Badge>
            )}
            <Badge variant="outline">ID: {createdStaffId}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{formData.email}</p>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              📧 A temporary password has been sent to{" "}
              <strong>{formData.email}</strong>
            </p>
            <p className="text-xs text-blue-600 mt-1">
              The staff member will be required to change their password on
              first login.
            </p>
          </div>
        </div>
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => {
              setIsSuccess(false);
              setStaffRole("");
              setCashierWindow("");
              setFormData({
                facultyId: "",
                firstName: "",
                lastName: "",
                email: "",
              });
            }}
          >
            Create Another
          </Button>
          <Button asChild className="bg-[#1B5A8C] hover:bg-[#0B3B5F]">
            <Link href="/admin/users">View All Users</Link>
          </Button>
        </div>
      </div>
    );
  }

  const inputClass =
    "pl-10 h-11 border-gray-200 focus:border-[#1B5A8C] focus:ring-1 focus:ring-[#1B5A8C]/20 focus-visible:ring-1 focus-visible:ring-[#1B5A8C]/20";

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {/* Staff Role Selection */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Select Staff Role
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Choose the role for the new staff account. A temporary password will
            be emailed automatically.
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
                  ? "bg-[#1B5A8C] text-white shadow-sm"
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
                    staffRole === role.value ? "text-white/70" : "text-gray-500"
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
            Enter the staff member's details. A temporary password will be sent
            to their email.
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
        <div className="p-4 bg-[#1B5A8C]/5 rounded-xl border border-[#1B5A8C]/10">
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
          <p className="text-xs text-muted-foreground mt-2">
            📧 A temporary password will be emailed to this address
          </p>
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
              <span className="animate-spin">⏳</span>
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
  );
}
