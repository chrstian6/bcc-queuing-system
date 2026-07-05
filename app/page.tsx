// app/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { useSearchParams, useRouter } from "next/navigation";
import HeroSection from "@/components/public/HeroSection";
import FeaturesSection from "@/components/public/FeatureSection";
import Header from "@/components/public/Header";
import { AlertCircle, X } from "lucide-react";
import Lenis from "lenis";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

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
  const [authError, setAuthError] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Handle auth errors from redirects
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam && authErrorMessages[errorParam]) {
      setAuthError(authErrorMessages[errorParam]);
      router.replace("/");
    }
  }, [searchParams, router]);

  // Initialize Lenis for smooth scrolling
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

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
                    router.push("/auth/login");
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

      {/* Header Component - No onLoginClick needed, uses router.push internally */}
      <Header />

      {/* Hero Section */}
      <HeroSection />

      {/* Features Section */}
      <FeaturesSection />
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
