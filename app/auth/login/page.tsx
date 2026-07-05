// app/auth/login/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus_Jakarta_Sans, Geist, Fraunces } from "next/font/google";
import { Eye, EyeOff, Mail, Lock, ArrowRight, ArrowLeft } from "lucide-react";
import { loginAction } from "@/actions/auth";
import { AuthRightColumn } from "@/components/auth/AuthRightColumn";

// ─── Fonts ───────────────────────────────────────────────────────────────────

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

// ─── Portals ─────────────────────────────────────────────────────────────────

type Portal = "student" | "staff" | "admin";

const PORTALS: {
  id: Portal;
  label: string;
  heading: string;
  subtitle: string;
  emailPlaceholder: string;
  fallbackRedirect: string;
}[] = [
  {
    id: "student",
    label: "Student",
    heading: "Student Portal",
    subtitle: "Sign in to track your tickets and request documents",
    emailPlaceholder: "student@bcc.edu.ph",
    fallbackRedirect: "/student/dashboard",
  },
  {
    id: "staff",
    label: "Staff",
    heading: "Staff Portal",
    subtitle: "Sign in to manage the queue and serve students",
    emailPlaceholder: "staff@bcc.edu.ph",
    fallbackRedirect: "/staff/cashier/dashboard",
  },
  {
    id: "admin",
    label: "Admin",
    heading: "Admin Portal",
    subtitle: "Sign in to manage the queuing system",
    emailPlaceholder: "admin@bcc.edu.ph",
    fallbackRedirect: "/admin/dashboard",
  },
];

// ─── Login page ───────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [portal, setPortal] = useState<Portal>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const activePortal = PORTALS.find((p) => p.id === portal)!;

  const handleLoginSuccess = (result: any) => {
    // Staff with a temp password must change it first
    if (result.mustChangePassword) {
      setTimeout(() => {
        window.location.href = "/change-password";
      }, 500);
      return;
    }

    setTimeout(() => {
      window.location.href = result.redirectTo || activePortal.fallbackRedirect;
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await loginAction(email, password, portal);

      if (result.success) {
        handleLoginSuccess(result);
        return;
      }

      setError(result.error || "Invalid email or password. Please try again.");
      setIsLoading(false);
    } catch (error: any) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Login error:", error);
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`${plusJakarta.variable} ${geist.variable} ${fraunces.variable} min-h-screen bg-white flex overflow-hidden`}
    >
      {/* ── Left column — login form ── */}
      <div className="w-full lg:w-1/2 flex flex-col min-h-screen">
        {/* SmartQ Logo - Top Left */}
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

        {/* Back Button */}
        <div className="px-6 md:px-12 lg:px-16 pb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#64748B] hover:text-[#0000CC] transition-colors group"
            style={{ fontFamily: "var(--font-geist-sans)" }}
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to home
          </Link>
        </div>

        {/* Login Form - Centered Vertically */}
        <div className="flex-1 flex items-center justify-center px-6 md:px-12 lg:px-16 py-8">
          <div className="w-full max-w-md">
            {/* Portal selector */}
            <div
              className="inline-flex items-center gap-1 bg-gray-100 rounded-lg p-1 mb-6"
              role="tablist"
              aria-label="Select portal"
            >
              {PORTALS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={portal === p.id}
                  onClick={() => {
                    setPortal(p.id);
                    setError("");
                  }}
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                    portal === p.id
                      ? "bg-white text-[#0000CC] shadow-sm"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  }`}
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Heading */}
            <div className="mb-8">
              <h1
                className="text-3xl md:text-4xl font-bold text-[#0F172A] mb-2"
                style={{ fontFamily: "var(--font-plus-jakarta)" }}
              >
                {activePortal.heading}
              </h1>
              <p
                className="text-[#64748B] text-sm mt-3"
                style={{ fontFamily: "var(--font-geist-sans)" }}
              >
                {activePortal.subtitle}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-[#0F172A] mb-1.5"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] peer-focus:text-[#0000CC] transition-colors" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={activePortal.emailPlaceholder}
                    className="peer w-full pl-10 pr-4 py-3 rounded-lg border border-[#E2E8F0] focus:border-[#0000CC] outline-none transition-colors text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: "var(--font-geist-sans)" }}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="password"
                    className="text-sm font-semibold text-[#0F172A]"
                    style={{ fontFamily: "var(--font-geist-sans)" }}
                  >
                    Password
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs font-medium text-[#0000CC] hover:underline"
                    style={{ fontFamily: "var(--font-geist-sans)" }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8] peer-focus:text-[#0000CC] transition-colors" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="peer w-full pl-10 pr-12 py-3 rounded-lg border border-[#E2E8F0] focus:border-[#0000CC] outline-none transition-colors text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: "var(--font-geist-sans)" }}
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
              </div>

              {/* Remember me */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#CBD5E1] text-[#0000CC] focus:ring-0 focus:ring-offset-0"
                    disabled={isLoading}
                  />
                  <span
                    className="text-sm text-[#475569]"
                    style={{ fontFamily: "var(--font-geist-sans)" }}
                  >
                    Remember me
                  </span>
                </label>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-lg bg-[#0000CC] text-white font-semibold text-sm hover:bg-[#000099] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                style={{ fontFamily: "var(--font-geist-sans)" }}
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
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              {portal === "student" ? (
                <p
                  className="text-center text-sm text-[#64748B]"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  No account yet?{" "}
                  <Link
                    href="/auth/register"
                    className="font-semibold text-[#0000CC] hover:underline"
                  >
                    Create one
                  </Link>
                </p>
              ) : (
                <p
                  className="text-center text-sm text-[#64748B]"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  Need access?{" "}
                  <Link
                    href="/contact"
                    className="font-semibold text-[#0000CC] hover:underline"
                  >
                    Contact IT Department
                  </Link>
                </p>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* ── Right column — static text with repulsion ── */}
      <AuthRightColumn />
    </div>
  );
}
