// components/public/Header.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Geist } from "next/font/google";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  weight: ["400", "500", "600", "700"],
});

interface HeaderProps {
  logoSrc?: string;
  logoAlt?: string;
  onLoginClick?: () => void;
}

export default function Header({
  logoSrc = "/images/bcc-logo-3.png",
  logoAlt = "Binalbagan Catholic College Logo",
  onLoginClick,
}: HeaderProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHoveringMenu, setIsHoveringMenu] = useState(false);

  const navItems = [
    {
      label: "Get a Ticket",
      href: "/public/schedule",
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
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      label: "Track Ticket",
      href: "/track",
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
      label: "Queue Dashboard",
      href: "/dashboard",
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
    <>
      <header className="absolute top-0 left-0 w-full z-50 bg-transparent">
        <div className="mx-auto px-6 md:px-8 h-[68px] flex items-center justify-between relative">
          {/* Logo + Wordmark */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0">
              <Image
                src={logoSrc}
                alt={logoAlt}
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="hidden md:flex flex-col">
              <span
                className="text-white text-sm font-semibold leading-tight tracking-[0.01em]"
                style={{ fontFamily: "var(--font-geist-sans)" }}
              >
                Binalbagan Catholic College
              </span>
              <span
                className="text-white/50 font-normal leading-tight mt-0.5"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-geist-sans)",
                }}
              >
                Binalbagan, Negros Occidental
              </span>
            </div>
          </Link>

          {/* Right Side - Login and Menu Button */}
          <div className="flex items-center gap-3">
            {/* Login Button */}
            <button
              onClick={onLoginClick}
              className="hidden md:flex items-center gap-2 text-white text-[13px] font-medium tracking-wide transition-all duration-200 hover:text-white/80"
              style={{
                background: "transparent",
                padding: "8px 20px",
                fontFamily: "var(--font-geist-sans)",
                letterSpacing: "0.03em",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="8"
                  cy="5.5"
                  r="2.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <path
                  d="M2.5 13.5C2.5 11.015 5.015 9 8 9s5.5 2.015 5.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
              Login
            </button>

            {/* Modern Hamburger Menu Button - Border pill with "Menu" text on hover */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              onMouseEnter={() => setIsHoveringMenu(true)}
              onMouseLeave={() => setIsHoveringMenu(false)}
              className="relative z-50 flex items-center justify-center px-4 py-2 rounded-full transition-all duration-300 border border-white/30 hover:border-white/60"
              aria-label="Open menu"
            >
              <div className="relative flex items-center justify-center">
                {/* Hamburger Icon - Fades out on hover */}
                <div
                  className={`absolute transition-all duration-300 ${
                    isHoveringMenu
                      ? "opacity-0 rotate-90"
                      : "opacity-100 rotate-0"
                  }`}
                >
                  <div className="flex flex-col gap-[5px]">
                    <span className="block w-[18px] h-[1.5px] bg-white rounded-full" />
                    <span className="block w-[14px] h-[1.5px] bg-white rounded-full" />
                    <span className="block w-[18px] h-[1.5px] bg-white rounded-full" />
                  </div>
                </div>

                {/* "Menu" Text - Fades in on hover */}
                <span
                  className={`text-white text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                    isHoveringMenu
                      ? "opacity-100 scale-100"
                      : "opacity-0 scale-90"
                  }`}
                  style={{
                    fontFamily: "var(--font-geist-sans)",
                    letterSpacing: "0.05em",
                  }}
                >
                  menu
                </span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Modern Sidebar Sheet */}
      <div
        className={`fixed inset-0 z-50 transition-all duration-500 ease-out ${
          isSidebarOpen ? "visible" : "invisible"
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${
            isSidebarOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsSidebarOpen(false)}
        />

        {/* Sidebar Panel */}
        <div
          className={`absolute right-0 top-0 h-full w-full max-w-md bg-gradient-to-br from-[#0B3B5F] to-[#1B5A8C] shadow-2xl transition-transform duration-500 ease-out ${
            isSidebarOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-white/10">
                <Image
                  src={logoSrc}
                  alt={logoAlt}
                  fill
                  className="object-contain p-1.5"
                />
              </div>
              <div>
                <h3
                  className="text-white font-semibold text-sm"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  BCC Queue System
                </h3>
                <p
                  className="text-white/40 text-xs"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  Version 1.0
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="text-white/70 hover:text-white transition-colors p-2"
              aria-label="Close menu"
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
          </div>

          {/* Sidebar Navigation */}
          <div className="flex-1 py-8 px-6">
            <nav className="flex flex-col gap-2">
              {navItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 group"
                >
                  <span className="text-white/60 group-hover:text-white/90 transition-colors">
                    {item.icon}
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{ fontFamily: "var(--font-geist-sans)" }}
                  >
                    {item.label}
                  </span>
                </Link>
              ))}
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white/60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p
                  className="text-white/40 text-xs"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  Need help?
                </p>
                <p
                  className="text-white/80 text-xs font-medium"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  bcc@queue.edu.ph
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
