// components/public/HeroSection.tsx
"use client";

import { Inter, Fraunces } from "next/font/google";
import { useEffect, useRef } from "react";
import LiveQueueSection from "@/components/public/LiveQueueSection";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700", "800", "900"],
});

interface HeroSectionProps {
  tagline?: string;
  imagePath?: string;
}

export default function HeroSection({
  tagline = "Skip the Line. Save Your Time. BCC Cares.",
  imagePath = "/images/bcc-hero-2.jpg",
}: HeroSectionProps) {
  const ruleRef = useRef<HTMLSpanElement>(null);
  const wordsRef = useRef<HTMLHeadingElement>(null);

  const words = tagline.split(" ");

  const renderWord = (word: string, index: number) => {
    const isBCC = word === "BCC";
    const isCares = word === "Cares.";
    const isFrauncesWord = isBCC || isCares;

    return (
      <span
        key={index}
        className="word inline-block"
        style={{
          opacity: 0,
          transform: "translateY(18px)",
          transition: "opacity 0.45s ease, transform 0.45s ease",
          color: isCares ? "#e8c87a" : "white",
          fontFamily: isFrauncesWord
            ? "var(--font-fraunces)"
            : "var(--font-inter)",
          fontWeight: isFrauncesWord ? 700 : 900,
          fontStyle: isFrauncesWord ? "italic" : "normal",
          marginRight: index < words.length - 1 ? "0.28em" : 0,
          letterSpacing: isFrauncesWord ? "-0.02em" : "-0.03em",
        }}
      >
        {word}
      </span>
    );
  };

  useEffect(() => {
    const rule = ruleRef.current;
    if (rule) {
      rule.style.transition = "width 0.7s ease 0.5s, opacity 0.7s ease 0.5s";
      rule.style.width = "80px";
      rule.style.opacity = "1";
    }

    const wordEls =
      wordsRef.current?.querySelectorAll<HTMLSpanElement>(".word");
    wordEls?.forEach((el, i) => {
      setTimeout(
        () => {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
        },
        350 + i * 70,
      );
    });
  }, []);

  return (
    <div
      className={`${inter.variable} ${fraunces.variable} relative overflow-hidden text-white`}
    >
      {/* Hero Background */}
      <div className="relative min-h-[440px] md:min-h-[520px] flex items-center">
        {/* Background Image with Blue Overlay */}
        {imagePath && (
          <div className="absolute inset-0 z-0">
            <img
              src={imagePath}
              alt="Binalbagan Catholic College Campus"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-[#0B3B5F]/85 via-[#1B5A8C]/75 to-[#2E7EB8]/70"></div>
          </div>
        )}

        {/* Diagonal accent stripes */}
        <div
          className="absolute pointer-events-none z-0"
          style={{
            top: "-60px",
            right: "-80px",
            width: "340px",
            height: "560px",
            background: "rgba(255,255,255,0.04)",
            transform: "rotate(-18deg)",
          }}
        />
        <div
          className="absolute pointer-events-none z-0"
          style={{
            top: "-40px",
            right: "30px",
            width: "80px",
            height: "560px",
            background: "rgba(255,255,255,0.03)",
            transform: "rotate(-18deg)",
          }}
        />

        {/* Content */}
        <div className="relative z-10 px-6 md:px-10 py-14 pb-20 max-w-4xl">
          {/* Eyebrow */}
          <div
            className="flex items-center gap-3 mb-5"
            style={{
              animation: "fadeUp 0.5s ease forwards 0.1s",
              opacity: 0,
              transform: "translateY(10px)",
            }}
          >
            <span
              className="text-white/50 uppercase tracking-[0.2em] font-light"
              style={{ fontSize: "11px", fontFamily: "var(--font-inter)" }}
            >
              Binalbagan Catholic College Inc.
            </span>
            <span
              ref={ruleRef}
              style={{
                display: "inline-block",
                height: "1px",
                width: "0",
                opacity: 0,
                background: "rgba(255,255,255,0.3)",
                transition: "none",
              }}
            />
          </div>

          {/* Tagline */}
          <h1
            ref={wordsRef}
            className="font-black uppercase m-0 p-0"
            style={{
              fontSize: "clamp(28px, 5.5vw, 56px)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            {words.map((word, i) => renderWord(word, i))}
          </h1>
        </div>

        {/* Double-wave divider */}
        <div
          className="absolute bottom-0 left-0 right-0 z-10"
          style={{ lineHeight: 0 }}
        >
          <svg
            viewBox="0 0 1440 90"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full block"
          >
            <path
              d="M0 45 C240 90 480 10 720 50 C960 90 1200 20 1440 50 L1440 90 L0 90 Z"
              fill="rgba(255,255,255,0.06)"
            />
            <path
              d="M0 60 C300 20 600 80 900 55 C1100 38 1300 65 1440 45 L1440 90 L0 90 Z"
              fill="white"
            />
          </svg>
        </div>
      </div>

      {/* Live Queue Section - Below Hero */}
      <LiveQueueSection />

      <style>{`
        @keyframes fadeUp {
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
