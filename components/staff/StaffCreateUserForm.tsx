// components/staff/StaffCreateUserForm.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
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
  GraduationCap,
  Wallet,
  Hash,
  LayoutGrid,
  Loader2,
  Building2,
} from "lucide-react";
import type { StaffRoleName } from "@/lib/roleCreationMatrix";

type StaffRole = StaffRoleName;

const ROLE_META: Record<
  StaffRole,
  { label: string; description: string; icon: any }
> = {
  dean: {
    label: "Dean",
    description:
      "Handles academic concerns, grade appeals, and student discipline",
    icon: Building2,
  },
  registrar: {
    label: "Registrar",
    description: "Manages student records, enrollment, and academic documents",
    icon: GraduationCap,
  },
  cashier: {
    label: "Cashier",
    description: "Handles payments, assessments, and financial transactions",
    icon: Wallet,
  },
  dsdw: {
    label: "DSDW",
    description: "Student discipline and welfare",
    icon: Building2,
  },
  head_dean: {
    label: "Head Dean",
    description: "Oversees deans and academic concerns",
    icon: Building2,
  },
  head_registrar: {
    label: "Head Registrar",
    description: "Oversees registrar operations",
    icon: GraduationCap,
  },
  head_cashier: {
    label: "Head Cashier",
    description: "Oversees cashiers, payments, and financial transactions",
    icon: Wallet,
  },
};

const CASHIER_WINDOWS = [
  { value: "1", label: "Window 1" },
  { value: "2", label: "Window 2" },
  { value: "3", label: "Window 3" },
  { value: "4", label: "Window 4" },
  { value: "5", label: "Window 5" },
];

interface Props {
  allowedRoles: StaffRole[];
  backHref: string;
}

export function StaffCreateUserForm({ allowedRoles, backHref }: Props) {
  const defaultRole = allowedRoles.length === 1 ? allowedRoles[0] : "";
  const [staffRole, setStaffRole] = useState<StaffRole | "">(
    defaultRole as StaffRole | "",
  );
  const [cashierWindow, setCashierWindow] = useState("");
  const [formData, setFormData] = useState({
    facultyId: "",
    firstName: "",
    lastName: "",
    email: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<{
    staffId: string;
    name: string;
    email: string;
  } | null>(null);

  const updateField = (field: string, value: string) => {
    if (field === "facultyId") value = value.replace(/\D/g, "").slice(0, 6);
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
    if (staffRole === "cashier" && !cashierWindow)
      newErrors.cashierWindow = "Please assign a window number";
    if (!formData.facultyId.trim())
      newErrors.facultyId = "Faculty ID is required";
    else if (!/^\d{6}$/.test(formData.facultyId))
      newErrors.facultyId = "Faculty ID must be exactly 6 digits";
    if (!formData.firstName.trim())
      newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = "Please enter a valid email address";
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
        roleName: staffRole as StaffRole,
        cashierWindow: staffRole === "cashier" ? cashierWindow : undefined,
        // NOTE: no roleAccessLevel — server derives it from roleName.
      });
      if (result.success && result.staff) {
        setSuccess({
          staffId: result.staff.staffId,
          name: `${result.staff.firstName} ${result.staff.lastName}`,
          email: result.staff.email,
        });
        setStaffRole(
          (allowedRoles.length === 1 ? allowedRoles[0] : "") as StaffRole | "",
        );
        setCashierWindow("");
        setFormData({ facultyId: "", firstName: "", lastName: "", email: "" });
      } else {
        setErrors({ submit: result.error || "Failed to create account" });
      }
    } catch {
      setErrors({ submit: "An unexpected error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "pl-10 h-11 border-gray-200 focus:border-[#1B5A8C] focus:ring-1 focus:ring-[#1B5A8C]/20 focus-visible:ring-1 focus-visible:ring-[#1B5A8C]/20";

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-sm font-semibold text-green-800">
            Account created
          </p>
          <p className="text-xs text-green-700 mt-1">
            {success.name} ({success.email}) — Staff ID:{" "}
            <span className="font-mono">{success.staffId}</span>. A temporary
            password has been sent to their email.
          </p>
        </div>
      )}

      {/* Role tiles — only the ones the head is allowed to create */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Select Staff Role
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {allowedRoles.map((roleName) => {
            const meta = ROLE_META[roleName];
            if (!meta) return null;
            const Icon = meta.icon;
            const selected = staffRole === roleName;
            return (
              <button
                key={roleName}
                type="button"
                onClick={() => {
                  setStaffRole(roleName);
                  if (roleName !== "cashier") setCashierWindow("");
                  setErrors((prev) => {
                    const n = { ...prev };
                    delete n.staffRole;
                    return n;
                  });
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                  selected
                    ? "bg-[#1B5A8C] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${selected ? "text-white" : "text-gray-500"}`}
                />
                <div className="min-w-0">
                  <p
                    className={`text-sm font-semibold ${selected ? "text-white" : "text-gray-900"}`}
                  >
                    {meta.label}
                  </p>
                  <p
                    className={`text-xs mt-0.5 hidden sm:block ${selected ? "text-white/70" : "text-gray-500"}`}
                  >
                    {meta.description}
                  </p>
                </div>
                {selected && (
                  <CheckCircle2 className="w-5 h-5 text-white ml-auto" />
                )}
              </button>
            );
          })}
        </div>
        {errors.staffRole && (
          <p className="text-sm text-red-600 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" /> {errors.staffRole}
          </p>
        )}
      </div>

      {/* Cashier window — only shown when target role is cashier */}
      {staffRole === "cashier" && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Assign Window Number <span className="text-red-500">*</span>
          </Label>
          <Select
            value={cashierWindow}
            onValueChange={(v) => {
              setCashierWindow(v);
              if (errors.cashierWindow)
                setErrors((prev) => {
                  const n = { ...prev };
                  delete n.cashierWindow;
                  return n;
                });
            }}
          >
            <SelectTrigger className="h-11 border-gray-200">
              <LayoutGrid className="w-4 h-4 mr-2 text-gray-400" />
              <SelectValue placeholder="Select window number" />
            </SelectTrigger>
            <SelectContent>
              {CASHIER_WINDOWS.map((w) => (
                <SelectItem key={w.value} value={w.value}>
                  {w.label}
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

      {/* Account fields */}
      <div className="space-y-5">
        <h3 className="text-lg font-semibold text-gray-900">
          Account Information
        </h3>

        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Faculty ID <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              inputMode="numeric"
              value={formData.facultyId}
              onChange={(e) => updateField("facultyId", e.target.value)}
              placeholder="000000"
              maxLength={6}
              className={inputClass}
            />
          </div>
          {errors.facultyId && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.facultyId}
            </p>
          )}
        </div>

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
              className={inputClass}
              placeholder="staff@example.com"
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.email}
            </p>
          )}
        </div>
      </div>

      {errors.submit && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-600">{errors.submit}</p>
        </div>
      )}

      <Separator />

      <div className="flex justify-between items-center">
        <Button type="button" variant="ghost" asChild>
          <Link href={backHref}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back
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
  );
}
