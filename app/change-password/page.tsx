// app/change-password/page.tsx
"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Shield, Check, X } from "lucide-react";
import { changeStaffPassword } from "@/actions/staff-auth";
import { getSession } from "@/actions/auth";

function ChangePasswordContent() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");

  // Check authentication and role
  useEffect(() => {
    async function checkAccess() {
      try {
        const sessionResult = await getSession();

        if (!sessionResult.success || !sessionResult.session) {
          router.push("/?error=unauthorized");
          return;
        }

        const user = sessionResult.session.user;
        setUserRole(user?.staffRole || "");
        setUserName(user?.name || "");
      } catch (error) {
        console.error("Check access error:", error);
        router.push("/?error=unauthorized");
      }
    }

    checkAccess();
  }, [router]);

  // Password requirements
  const requirements = [
    {
      label: "At least 8 characters",
      met: newPassword.length >= 8,
    },
    {
      label: "Contains uppercase letter",
      met: /[A-Z]/.test(newPassword),
    },
    {
      label: "Contains lowercase letter",
      met: /[a-z]/.test(newPassword),
    },
    {
      label: "Contains number",
      met: /[0-9]/.test(newPassword),
    },
    {
      label: "Passwords match",
      met: newPassword === confirmPassword && newPassword.length > 0,
    },
  ];

  const allRequirementsMet = requirements.every((req) => req.met);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      if (!currentPassword) {
        setError("Current password is required");
        setIsLoading(false);
        return;
      }

      if (!allRequirementsMet) {
        setError("Please meet all password requirements");
        setIsLoading(false);
        return;
      }

      const result = await changeStaffPassword(currentPassword, newPassword);

      if (!result.success) {
        setError(result.error || "Failed to change password");
        setIsLoading(false);
        return;
      }

      setSuccess("Password changed successfully! Redirecting to dashboard...");

      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Dynamic redirect based on role using staff/[role]/dashboard
      setTimeout(() => {
        const role = userRole || "staff";
        router.push(`/staff/${role}/dashboard`);
      }, 2000);
    } catch (error: any) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Change password error:", error);
      setIsLoading(false);
    }
  };

  // Get role display name
  const roleNames: Record<string, string> = {
    registrar: "Registrar",
    dean: "Dean",
    dsdw: "DSDW",
    cashier: "Cashier",
  };
  const roleDisplayName = roleNames[userRole] || "Staff";

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6 text-[#1B5A8C]" />
            <h1 className="text-2xl font-bold text-gray-900 font-['Plus_Jakarta_Sans']">
              Change Password
            </h1>
          </div>
          <p className="text-gray-500 font-['Plus_Jakarta_Sans']">
            Please change your temporary password to continue
          </p>
          {userRole && (
            <p className="text-sm text-gray-400 mt-1 font-['Plus_Jakarta_Sans']">
              Logged in as {userName || roleDisplayName} • {roleDisplayName}
            </p>
          )}
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-center gap-3">
            <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-700 font-['Plus_Jakarta_Sans']">
              {success}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-center gap-3">
            <X className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 font-['Plus_Jakarta_Sans']">
              {error}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Current Password */}
          <div>
            <label
              htmlFor="current-password"
              className="block text-sm font-medium text-gray-700 mb-2 font-['Plus_Jakarta_Sans']"
            >
              Current Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
              <input
                id="current-password"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B5A8C] focus:border-transparent transition-all font-['Plus_Jakarta_Sans'] text-gray-900 placeholder-gray-400"
                placeholder="Enter temporary password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label
              htmlFor="new-password"
              className="block text-sm font-medium text-gray-700 mb-2 font-['Plus_Jakarta_Sans']"
            >
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
              <input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B5A8C] focus:border-transparent transition-all font-['Plus_Jakarta_Sans'] text-gray-900 placeholder-gray-400"
                placeholder="Enter new password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-gray-700 mb-2 font-['Plus_Jakarta_Sans']"
            >
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B5A8C] focus:border-transparent transition-all font-['Plus_Jakarta_Sans'] text-gray-900 placeholder-gray-400"
                placeholder="Confirm new password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          {newPassword && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider font-['Plus_Jakarta_Sans']">
                Password Requirements
              </p>
              {requirements.map((req, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                      req.met ? "bg-green-500" : "bg-gray-200"
                    }`}
                  >
                    {req.met && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span
                    className={`text-xs font-['Plus_Jakarta_Sans'] ${
                      req.met ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#1B5A8C] text-white font-semibold py-2.5 rounded-lg hover:bg-[#0B3B5F] transition-all duration-200 font-['Plus_Jakarta_Sans'] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                Changing Password...
              </>
            ) : (
              "Change Password"
            )}
          </button>
        </form>

        {/* Back to Login */}
        <div className="mt-6">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors font-['Plus_Jakarta_Sans']"
          >
            ← Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1B5A8C]"></div>
        </div>
      }
    >
      <ChangePasswordContent />
    </Suspense>
  );
}
