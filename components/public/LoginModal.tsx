// components/public/LoginModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { loginAction } from "@/actions/auth";

type UserRole = "admin" | "student";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin?: (role: UserRole, email: string) => void;
}

export default function LoginModal({
  isOpen,
  onClose,
  onLogin,
}: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [isAnimating, setIsAnimating] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { update } = useSession();

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = "hidden";
      setError("");
      setEmail("");
      setPassword("");
      setRole("student");
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 300);
      document.body.style.overflow = "";
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await loginAction(email, password, role);

      if (!result.success) {
        setError(result.error || "Login failed. Please try again.");
        setIsLoading(false);
        return;
      }

      console.log("Login successful:", { role, email });
      onLogin?.(role, email);

      // Update session and redirect
      await update();
      router.push(result.redirectTo || "/");
      router.refresh();

      onClose();
    } catch (error: any) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // Get dynamic placeholder and label based on role
  const getEmailPlaceholder = () => {
    if (role === "admin") return "admin@bcc.edu.ph";
    return "student@bcc.edu.ph";
  };

  const getTitleText = () => {
    if (role === "admin") return "Admin Access";
    return "Student Portal";
  };

  const getDescriptionText = () => {
    if (role === "admin") return "Login to manage queue system";
    return "Login to join queues and track your turn";
  };

  if (!isOpen && !isAnimating) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleBackdropClick}
      ></div>

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          ref={modalRef}
          className={`w-full max-w-4xl transition-all duration-300 pointer-events-auto ${
            isOpen
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 translate-y-8 scale-95"
          }`}
        >
          <div className="bg-white shadow-2xl overflow-hidden md:rounded-2xl">
            <div className="grid md:grid-cols-2">
              {/* Left Side - Form */}
              <form onSubmit={handleSubmit} className="p-6 md:p-8">
                {/* Close buttons */}
                <button
                  type="button"
                  onClick={onClose}
                  className="md:hidden absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="hidden md:block absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-2xl font-bold text-gray-900 font-['Plus_Jakarta_Sans']">
                      {getTitleText()}
                    </h1>
                    <p className="text-balance text-gray-500 font-['Plus_Jakarta_Sans']">
                      {getDescriptionText()}
                    </p>
                  </div>

                  {/* Role Selection Toggle */}
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setRole("student");
                        setError("");
                        setEmail("");
                        setPassword("");
                      }}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 font-['Plus_Jakarta_Sans'] ${
                        role === "student"
                          ? "bg-white text-[#1B5A8C] shadow-sm"
                          : "text-gray-600 hover:text-gray-800"
                      }`}
                    >
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRole("admin");
                        setError("");
                        setEmail("");
                        setPassword("");
                      }}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 font-['Plus_Jakarta_Sans'] ${
                        role === "admin"
                          ? "bg-white text-[#1B5A8C] shadow-sm"
                          : "text-gray-600 hover:text-gray-800"
                      }`}
                    >
                      Admin / Faculty
                    </button>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700 mb-1.5 font-['Plus_Jakarta_Sans']"
                      >
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1B5A8C] focus:border-transparent transition-all font-['Plus_Jakarta_Sans'] text-gray-900 placeholder-gray-400"
                        placeholder={getEmailPlaceholder()}
                        required
                        disabled={isLoading}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="password"
                          className="block text-sm font-medium text-gray-700 font-['Plus_Jakarta_Sans']"
                        >
                          Password
                        </label>
                        <a
                          href="#"
                          className="text-sm text-[#1B5A8C] hover:text-[#0B3B5F] transition-colors font-['Plus_Jakarta_Sans']"
                        >
                          Forgot password?
                        </a>
                      </div>
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1B5A8C] focus:border-transparent transition-all font-['Plus_Jakarta_Sans'] text-gray-900 placeholder-gray-400"
                        placeholder="••••••••"
                        required
                        disabled={isLoading}
                      />
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-600 font-['Plus_Jakarta_Sans']">
                          {error}
                        </p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-[#1B5A8C] text-white font-semibold py-2 hover:bg-[#0B3B5F] transition-all duration-200 font-['Plus_Jakarta_Sans'] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
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
                          Logging in...
                        </span>
                      ) : (
                        `Login as ${role === "admin" ? "Admin" : "Student"}`
                      )}
                    </button>

                    {/* Demo Credentials Info */}
                    <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                      <p className="text-xs text-gray-500 font-['Plus_Jakarta_Sans'] text-center">
                        Demo Credentials:
                        <br />
                        Student: student@bcc.edu.ph / student123
                        <br />
                        Admin: admin@bcc.edu.ph / admin123
                      </p>
                    </div>

                    {/* Contact Admin Message - Only show for admin/faculty */}
                    {role === "admin" && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-center text-sm text-gray-600 font-['Plus_Jakarta_Sans']">
                          Need access?{" "}
                          <a
                            href="#"
                            className="text-[#1B5A8C] hover:text-[#0B3B5F] font-medium hover:underline transition-colors"
                          >
                            Contact IT Department
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </form>

              {/* Right Side - Image Background with Blue Overlay */}
              <div className="relative hidden md:block">
                <div className="relative h-full min-h-[520px]">
                  <Image
                    src="/images/bcc-hero-2.jpg"
                    alt="Binalbagan Catholic College Campus"
                    fill
                    className="object-cover"
                    priority
                  />
                  {/* Blue Gradient Overlay - BCC Colors */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0B3B5F]/80 via-[#1B5A8C]/70 to-[#2E7EB8]/60"></div>

                  {/* Dynamic overlay text based on role */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-white text-center">
                    <div className="mb-4 w-16 h-16 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                      {role === "admin" ? (
                        <svg
                          className="w-8 h-8"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-8 h-8"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold mb-1 font-['Plus_Jakarta_Sans']">
                      {role === "admin"
                        ? "Administrator Access"
                        : "Student Portal"}
                    </h3>
                    <p className="text-blue-100 text-sm font-['Plus_Jakarta_Sans']">
                      {role === "admin"
                        ? "Manage queues, view analytics, and control system settings"
                        : "Join queues, track your turn, and get notified"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Terms */}
            <div className="px-6 py-4 border-t border-gray-100">
              <p className="text-center text-xs text-gray-500 font-['Plus_Jakarta_Sans']">
                By clicking continue, you agree to our{" "}
                <a href="#" className="text-[#1B5A8C] hover:underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-[#1B5A8C] hover:underline">
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
