// app/auth/register/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus_Jakarta_Sans, Geist, Fraunces } from "next/font/google";
import {
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Check,
  X as XIcon,
} from "lucide-react";
import { registerStudentAction } from "@/actions/auth";
import { AuthRightColumn } from "@/components/auth/AuthRightColumn";
import { PASSWORD_RULES } from "@/types/student";
import {
  YEAR_LEVELS,
  VALID_SUFFIXES,
  getCampusForYearLevel,
  type YearLevel,
} from "@/types/ticket";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  weight: ["400", "500", "600", "700", "900"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});

const inputClass =
  "w-full px-4 py-3 rounded-lg border border-[#E2E8F0] focus:border-[#0000CC] outline-none transition-colors text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed";

export default function RegisterPage() {
  const [form, setForm] = useState({
    schoolId: "",
    firstName: "",
    lastName: "",
    middleName: "",
    suffix: "",
    year: "",
    contactNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const campus = useMemo(
    () => getCampusForYearLevel(form.year as YearLevel | ""),
    [form.year],
  );

  const set = (field: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const passwordChecks = PASSWORD_RULES.map((rule) => ({
    ...rule,
    passed: rule.test(form.password),
  }));
  const passwordsMatch =
    form.confirmPassword.length > 0 && form.password === form.confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(form.schoolId)) {
      setError("School ID must be exactly 6 digits");
      return;
    }
    if (!form.year) {
      setError("Please select your year level");
      return;
    }
    if (passwordChecks.some((c) => !c.passed)) {
      setError("Password does not meet all requirements");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerStudentAction(form as any);
      if (result.success) {
        window.location.href = result.redirectTo || "/student/dashboard";
        return;
      }
      setError(result.error || "Registration failed. Please try again.");
      setIsLoading(false);
    } catch (err) {
      console.error("Registration error:", err);
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`${plusJakarta.variable} ${geist.variable} ${fraunces.variable} min-h-screen bg-white flex overflow-hidden`}
    >
      {/* ── Left column — registration form ── */}
      <div className="w-full lg:w-1/2 flex flex-col min-h-screen overflow-y-auto">
        <div className="px-6 md:px-12 lg:px-16 pt-6 pb-4">
          <Link href="/" className="inline-block">
            <span
              className="font-black tracking-tight"
              style={{
                fontFamily: "var(--font-fraunces)",
                fontSize: "28px",
                letterSpacing: "-0.02em",
                color: "#0000CC",
                fontStyle: "italic",
              }}
            >
              SmartQ
            </span>
          </Link>
        </div>

        <div className="px-6 md:px-12 lg:px-16 pb-4">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#64748B] hover:text-[#0000CC] transition-colors group"
            style={{ fontFamily: "var(--font-geist-sans)" }}
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to login
          </Link>
        </div>

        <div className="flex-1 flex items-start justify-center px-6 md:px-12 lg:px-16 py-8">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1
                className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-2"
                style={{ fontFamily: "var(--font-plus-jakarta)" }}
              >
                Create Student Account
              </h1>
              <p
                className="text-[#64748B] text-sm mt-3"
                style={{ fontFamily: "var(--font-geist-sans)" }}
              >
                Track your queue tickets and request registrar documents
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
              style={{ fontFamily: "var(--font-geist-sans)" }}
            >
              {/* School ID */}
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                  School ID
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.schoolId}
                  onChange={(e) =>
                    set("schoolId")(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="6-digit school ID"
                  className={inputClass}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Names */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => set("firstName")(e.target.value)}
                    placeholder="Juan"
                    className={inputClass}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => set("lastName")(e.target.value)}
                    placeholder="Dela Cruz"
                    className={inputClass}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                    Middle Name{" "}
                    <span className="font-normal text-[#94A3B8]">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={form.middleName}
                    onChange={(e) => set("middleName")(e.target.value)}
                    className={inputClass}
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                    Suffix{" "}
                    <span className="font-normal text-[#94A3B8]">
                      (optional)
                    </span>
                  </label>
                  <select
                    value={form.suffix}
                    onChange={(e) => set("suffix")(e.target.value)}
                    className={inputClass}
                    disabled={isLoading}
                  >
                    {VALID_SUFFIXES.map((s) => (
                      <option key={s || "none"} value={s}>
                        {s || "None"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Year level → campus */}
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                  Year Level
                </label>
                <select
                  value={form.year}
                  onChange={(e) => set("year")(e.target.value)}
                  className={inputClass}
                  required
                  disabled={isLoading}
                >
                  <option value="">Select year level</option>
                  {YEAR_LEVELS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                {campus && (
                  <p className="mt-1.5 text-xs text-[#64748B]">
                    Campus: <span className="font-medium">{campus}</span>
                  </p>
                )}
              </div>

              {/* Contact + email */}
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                  Contact Number{" "}
                  <span className="font-normal text-[#94A3B8]">(optional)</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={11}
                  value={form.contactNumber}
                  onChange={(e) =>
                    set("contactNumber")(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="09XXXXXXXXX"
                  className={inputClass}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email")(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => set("password")(e.target.value)}
                    placeholder="Create a password"
                    className={`${inputClass} pr-12`}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {form.password.length > 0 && (
                  <ul className="mt-2 grid grid-cols-2 gap-1">
                    {passwordChecks.map((check) => (
                      <li
                        key={check.id}
                        className={`flex items-center gap-1.5 text-xs ${
                          check.passed ? "text-green-600" : "text-[#94A3B8]"
                        }`}
                      >
                        {check.passed ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <XIcon className="w-3 h-3" />
                        )}
                        {check.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => set("confirmPassword")(e.target.value)}
                  placeholder="Re-enter your password"
                  className={inputClass}
                  required
                  disabled={isLoading}
                />
                {form.confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="mt-1.5 text-xs text-red-500">
                    Passwords do not match
                  </p>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-lg bg-[#0000CC] text-white font-semibold text-sm hover:bg-[#000099] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Creating account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <p className="text-center text-sm text-[#64748B]">
                Already have an account?{" "}
                <Link
                  href="/auth/login"
                  className="font-semibold text-[#0000CC] hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* ── Right column ── */}
      <AuthRightColumn />
    </div>
  );
}
