// app/page.tsx
"use client";

import { useState } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import HeroSection from "@/components/public/HeroSection";
import Header from "@/components/public/Header";
import LoginModal from "@/components/public/LoginModal";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLogin = (role: "admin" | "student", email: string) => {
    console.log(`Logged in as ${role}: ${email}`);
    alert(
      `Welcome ${role === "admin" ? "Admin" : "Student"}! You have successfully logged in.`,
    );
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

  return (
    <div
      className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-white font-sans`}
    >
      {/* Header Component */}
      <Header onLoginClick={() => setIsModalOpen(true)} />

      {/* Hero Section */}
      <HeroSection />

      {/* Features Section */}
      <div className="px-8 py-12 md:py-16 bg-white">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
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

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
            {features.map((feature, index) => (
              <div key={index} className="flex flex-col p-2">
                <div className="mb-3 text-[#1B5A8C]">{feature.icon}</div>
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
        onClose={() => setIsModalOpen(false)}
        onLogin={handleLogin}
      />
    </div>
  );
}
