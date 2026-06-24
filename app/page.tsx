// app/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { useSearchParams, useRouter } from "next/navigation";
import HeroSection from "@/components/public/HeroSection";
import Header from "@/components/public/Header";
import LoginModal from "@/components/public/LoginModal";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronRight, AlertCircle, X } from "lucide-react";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

// Transaction types data
const transactionTypes = [
  {
    id: "tor",
    label: "Request for TOR",
    description: "Transcript of Records - official academic record",
  },
  {
    id: "coe",
    label: "Request for COE",
    description: "Certificate of Enrollment - proof of enrollment",
  },
  {
    id: "request-grades",
    label: "Request for Grades",
    description: "Official grade report per semester or term",
  },
  {
    id: "enrollment-fees",
    label: "Enrollment Fees",
    description: "Payment for enrollment and registration fees",
  },
  {
    id: "assessment",
    label: "Request Assessment",
    description: "Request breakdown of fees, charges, and balances",
  },
  {
    id: "exam-fees",
    label: "Exam Fees",
    description: "Payment for examination-related fees and permits",
  },
  {
    id: "payments",
    label: "Payments",
    description: "General payments for tuition, miscellaneous, and other fees",
  },
];

// Error messages mapping
const authErrorMessages: Record<string, { title: string; message: string }> = {
  unauthorized: {
    title: "Login Required",
    message:
      "Please login to access this page. Use your admin or staff credentials to continue.",
  },
  forbidden: {
    title: "Access Denied",
    message:
      "You don't have permission to access this page. Please login with the correct account type.",
  },
  "invalid-role": {
    title: "Invalid Role",
    message:
      "The requested role is not valid. Please contact the IT department for assistance.",
  },
  auth_error: {
    title: "Authentication Error",
    message: "An authentication error occurred. Please try logging in again.",
  },
};

function HomeContent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [authError, setAuthError] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Open login modal if redirected from protected route
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam && authErrorMessages[errorParam]) {
      setAuthError(authErrorMessages[errorParam]);
      setIsModalOpen(true);
      router.replace("/");
    }
  }, [searchParams, router]);

  const handleTransactionSelect = (value: string) => {
    setSelectedTransaction(value);
    setError("");
  };

  const handleContinue = () => {
    if (!selectedTransaction) {
      setError("Please select a transaction type to continue");
      return;
    }
    router.push(`/public/schedule?type=${selectedTransaction}`);
  };

  const handleLogin = (email: string) => {
    console.log(`Login successful for: ${email}`);
    setAuthError(null);
  };

  const features = [
    {
      title: "Real-Time Queue Tracking",
      description:
        "Monitor queue status and wait times instantly. See exactly where you are in line with live updates.",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      title: "Digital Ticket System",
      description:
        "Generate and manage digital queue tickets. Join queues through web or mobile without paper.",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 5v2m0 4v2m0 4v2M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"
          />
        </svg>
      ),
    },
    {
      title: "SMS Notifications",
      description:
        "Get automatic text messages when your turn approaches. Never miss your queue position.",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      ),
    },
    {
      title: "Service Analytics",
      description:
        "Access data on queue performance and service efficiency. Make informed decisions to improve operations.",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
  ];

  const selectedTransactionLabel = transactionTypes.find(
    (t) => t.id === selectedTransaction,
  )?.label;

  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-white font-sans`}
    >
      {/* Auth Error Banner */}
      {authError && (
        <div className="fixed top-4 right-4 z-50 max-w-md bg-white border border-red-200 rounded-xl shadow-lg p-4 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 font-['Plus_Jakarta_Sans']">
                {authError.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1 font-['Plus_Jakarta_Sans']">
                {authError.message}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    setAuthError(null);
                    setIsModalOpen(true);
                  }}
                  className="text-sm font-medium text-[#1B5A8C] hover:text-[#0B3B5F] font-['Plus_Jakarta_Sans']"
                >
                  Login now →
                </button>
                <button
                  onClick={() => setAuthError(null)}
                  className="text-sm text-gray-500 hover:text-gray-700 font-['Plus_Jakarta_Sans']"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button
              onClick={() => setAuthError(null)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header Component */}
      <Header onLoginClick={() => setIsModalOpen(true)} />

      {/* Hero Section */}
      <HeroSection />

      {/* Transaction Selection Section */}
      <div className="px-6 md:px-10 py-12">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h2
              className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 tracking-tight"
              style={{ fontFamily: "var(--font-geist-sans)" }}
            >
              Get in Line
            </h2>
            <p
              className="text-gray-500 text-sm md:text-base leading-relaxed"
              style={{ fontFamily: "var(--font-geist-sans)" }}
            >
              Choose the service you need and join the virtual queue. We'll
              notify you when it's your turn.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="transaction-select"
                className="text-sm font-medium text-gray-700 mb-2 block"
                style={{ fontFamily: "var(--font-geist-sans)" }}
              >
                What do you need today?
              </label>
              <Select
                value={selectedTransaction}
                onValueChange={handleTransactionSelect}
              >
                <SelectTrigger
                  id="transaction-select"
                  className="w-full h-14 px-5 text-base border-gray-200 hover:border-gray-300 focus:ring-[#1B5A8C] focus:border-[#1B5A8C] transition-colors"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  <SelectValue placeholder="Select a transaction type...">
                    {selectedTransactionLabel || "Select a transaction type..."}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="p-1">
                  {transactionTypes.map((type) => (
                    <SelectItem
                      key={type.id}
                      value={type.id}
                      className="py-3.5 px-4 rounded-md cursor-pointer data-[state=checked]:bg-[#1B5A8C]/5 data-[state=checked]:text-[#1B5A8C] focus:bg-gray-50"
                    >
                      <div className="flex flex-col">
                        <span
                          className="text-sm font-medium text-gray-900"
                          style={{ fontFamily: "var(--font-geist-sans)" }}
                        >
                          {type.label}
                        </span>
                        <span
                          className="text-xs text-gray-500 mt-0.5"
                          style={{ fontFamily: "var(--font-geist-sans)" }}
                        >
                          {type.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span style={{ fontFamily: "var(--font-geist-sans)" }}>
                  {error}
                </span>
              </div>
            )}

            <Button
              onClick={handleContinue}
              className="w-full h-12 bg-[#1B5A8C] hover:bg-[#0B3B5F] text-white font-medium text-sm transition-colors"
              style={{ fontFamily: "var(--font-geist-sans)" }}
            >
              Get Ticket
              <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="px-8 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-12">
            <h2
              className="text-xl md:text-2xl font-semibold text-gray-900 mb-2 tracking-tight"
              style={{ fontFamily: "var(--font-geist-sans)" }}
            >
              No more standing in long lines.
            </h2>
            <p
              className="text-gray-500 text-sm max-w-2xl mx-auto leading-relaxed px-4"
              style={{ fontFamily: "var(--font-geist-sans)" }}
            >
              BCC's smart queue system lets students, faculty, and staff join
              lines digitally, track wait times in real time, and get notified
              when it's their turn — all from their phone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex flex-col p-4 rounded-xl border border-transparent hover:border-gray-200 hover:shadow-sm transition-all duration-300"
              >
                <div className="mb-3 text-gray-900">{feature.icon}</div>
                <h3
                  className="text-base font-semibold text-gray-900 mb-1.5 tracking-tight"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  {feature.title}
                </h3>
                <p
                  className="text-xs text-gray-500 leading-relaxed"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setAuthError(null);
        }}
        onLogin={handleLogin}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <HomeContent />
    </Suspense>
  );
}
