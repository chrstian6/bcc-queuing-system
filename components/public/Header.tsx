// components/public/Header.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import { useState, useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import gsap from "gsap";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});

interface HeaderProps {
  onLoginClick?: () => void;
}

export default function Header({ onLoginClick }: HeaderProps) {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAtFeatures, setIsAtFeatures] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loginButtonRef = useRef<HTMLButtonElement>(null);
  const hoverBgRef = useRef<HTMLDivElement>(null);
  const oldTextRef = useRef<HTMLDivElement>(null);
  const newTextRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  const handleLoginClick = () => {
    if (onLoginClick) {
      onLoginClick();
    } else {
      router.push("/auth/login");
    }
  };

  const splitIntoCharacters = (text: string): string[] => {
    return Array.from(text);
  };

  const textChars = splitIntoCharacters("Login");
  const newTextChars = splitIntoCharacters("Login");

  useEffect(() => {
    if (isMobileMenuOpen) {
      const handleScroll = () => setIsMobileMenuOpen(false);
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, [isMobileMenuOpen]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const oldText = oldTextRef.current;
    const newText = newTextRef.current;
    const hoverBg = hoverBgRef.current;
    if (!oldText || !newText || !hoverBg) return;

    const oldChars = oldText.querySelectorAll(".char-item");
    const newChars = newText.querySelectorAll(".char-item");
    if (oldChars.length === 0 || newChars.length === 0) return;

    gsap.killTweensOf([hoverBg, oldChars, newChars]);

    const DURATION = 0.45;
    const EASE = "power3.inOut";

    const tl = gsap.timeline();

    if (isHovered) {
      tl.to(
        hoverBg,
        {
          duration: DURATION,
          ease: EASE,
          scaleX: 1,
          translateY: "0%",
        },
        0,
      )
        .to(
          oldChars,
          {
            duration: DURATION,
            ease: EASE,
            y: "-100%",
            opacity: 0,
            stagger: 0.02,
          },
          0,
        )
        .fromTo(
          newChars,
          { y: "100%", opacity: 0 },
          {
            duration: DURATION,
            ease: EASE,
            y: "0%",
            opacity: 1,
            stagger: 0.02,
          },
          0,
        );
    } else {
      tl.to(
        hoverBg,
        {
          duration: DURATION,
          ease: EASE,
          scaleX: 0.2,
          translateY: "200%",
        },
        0,
      )
        .to(
          newChars,
          {
            duration: DURATION,
            ease: EASE,
            y: "100%",
            opacity: 0,
            stagger: { each: 0.02, from: "end" },
          },
          0,
        )
        .to(
          oldChars,
          {
            duration: DURATION,
            ease: EASE,
            y: "0%",
            opacity: 1,
            stagger: { each: 0.02, from: "end" },
          },
          0,
        );
    }

    return () => {
      tl.kill();
    };
  }, [isHovered]);

  useEffect(() => {
    requestAnimationFrame(() => {
      isFirstRender.current = false;
    });

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const shouldBeScrolled = scrollY > 20;

      const featuresSection = document.querySelector("#features-section");
      let atFeatures = false;

      if (featuresSection) {
        const rect = featuresSection.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.4 && rect.bottom >= 0) {
          atFeatures = true;
        }
      }

      if (shouldBeScrolled !== isScrolled) {
        setIsScrolled(shouldBeScrolled);
      }

      if (atFeatures !== isAtFeatures) {
        setIsAtFeatures(atFeatures);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isScrolled, isAtFeatures]);

  useEffect(() => {
    if (isFirstRender.current) return;

    const header = headerRef.current;
    const container = containerRef.current;

    if (!header || !container) return;

    gsap.killTweensOf(header);
    gsap.killTweensOf(container);

    const showIsland = isScrolled || isAtFeatures;

    gsap.to(header, {
      duration: 0.6,
      ease: "power3.inOut",
      paddingTop: showIsland ? 8 : 0,
      paddingBottom: showIsland ? 8 : 0,
      overwrite: "auto",
    });

    if (isScrolled || isAtFeatures) {
      gsap.to(container, {
        duration: 0.7,
        ease: "power3.inOut",
        width: "92%",
        maxWidth: "900px",
        borderRadius: 9999,
        backgroundColor: "#ffffff",
        boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.05)",
        paddingLeft: 6,
        paddingRight: 6,
        overwrite: "auto",
      });
    } else {
      gsap.to(container, {
        duration: 0.7,
        ease: "power3.inOut",
        width: "100%",
        maxWidth: "100%",
        borderRadius: 0,
        backgroundColor: "rgba(255,255,255,0)",
        boxShadow: "0 4px 20px rgba(0,0,0,0)",
        borderWidth: 0,
        borderColor: "rgba(0,0,0,0)",
        paddingLeft: 0,
        paddingRight: 0,
        overwrite: "auto",
      });
    }
  }, [isScrolled, isAtFeatures]);

  const handleMobileNavClick = (href: string) => {
    setIsMobileMenuOpen(false);
    router.push(href);
  };

  return (
    <div className={`${plusJakarta.variable} ${fraunces.variable}`}>
      <header
        ref={headerRef}
        className="fixed top-0 left-0 w-full z-50 flex justify-center"
        style={{ paddingTop: 0, paddingBottom: 0 }}
      >
        <div
          ref={containerRef}
          className="transition-shadow duration-300"
          style={{
            width: "100%",
            maxWidth: "100%",
            backgroundColor: "rgba(255,255,255,0)",
            borderRadius: 0,
            boxShadow: "0 4px 20px rgba(0,0,0,0)",
            borderWidth: 0,
            borderColor: "rgba(0,0,0,0)",
            paddingLeft: 0,
            paddingRight: 0,
          }}
        >
          <div className="h-[56px] flex items-center justify-between relative px-4 md:px-6">
            {/* SmartQ Logo */}
            <Link
              href="/"
              className="flex items-center gap-3 shrink-0 group"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span
                className="font-black tracking-tight transition-colors duration-300"
                style={{
                  fontFamily: "var(--font-fraunces)",
                  fontSize: "clamp(18px, 1.8vw, 26px)",
                  letterSpacing: "-0.02em",
                  color: "#0000CC",
                }}
              >
                SmartQ
              </span>
            </Link>

            {/* Center Navigation - Desktop Only */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-8">
              <Link
                href="/"
                className="text-[13px] font-medium transition-colors duration-200 hover:text-[#0000CC] relative group/link"
                style={{
                  color: "#2A2D34",
                  fontFamily: "var(--font-plus-jakarta)",
                  letterSpacing: "0.02em",
                }}
              >
                Home
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#0000CC] transition-all duration-300 group-hover/link:w-full" />
              </Link>
              <Link
                href="/live-queue"
                className="text-[13px] font-medium transition-colors duration-200 hover:text-[#0000CC] relative group/link"
                style={{
                  color: "#2A2D34",
                  fontFamily: "var(--font-plus-jakarta)",
                  letterSpacing: "0.02em",
                }}
              >
                Live Queue
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#0000CC] transition-all duration-300 group-hover/link:w-full" />
              </Link>
            </nav>

            {/* Right Side - Login (Desktop) / Menu (Mobile) */}
            <div className="flex items-center gap-3">
              {/* Login Button - Desktop Only */}
              <button
                ref={loginButtonRef}
                onClick={handleLoginClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="hidden md:flex items-center justify-center text-[13px] font-bold tracking-wide transition-all duration-300 rounded-full px-5 py-2 overflow-hidden relative cursor-pointer"
                style={{
                  background: "#0000CC",
                  color: "#ffffff",
                  fontFamily: "var(--font-plus-jakarta)",
                  letterSpacing: "0.03em",
                  minWidth: "80px",
                  height: "38px",
                  border: "1px solid transparent",
                }}
              >
                <div
                  ref={hoverBgRef}
                  className="button-hover-bg absolute inset-0 rounded-full will-change-transform"
                  style={{
                    backgroundColor: "#ffffff",
                    transform: "scaleX(0.2) translateY(200%)",
                    transformOrigin: "center bottom",
                  }}
                />

                <div
                  ref={oldTextRef}
                  className="relative z-10 flex items-center justify-center overflow-hidden"
                  style={{
                    height: "20px",
                    width: "100%",
                    position: "absolute",
                    inset: 0,
                    margin: "auto",
                  }}
                >
                  <div
                    className="flex items-center justify-center"
                    style={{ position: "relative" }}
                  >
                    {textChars.map((char, index) => (
                      <span
                        key={`old-${index}`}
                        className="char-item inline-block"
                        style={{
                          opacity: 1,
                          transform: "translateY(0%)",
                          whiteSpace: char === " " ? "pre" : "normal",
                          color: "#ffffff",
                          fontSize: "13px",
                          fontWeight: 700,
                          lineHeight: 1,
                          display: "inline-block",
                        }}
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  ref={newTextRef}
                  className="relative z-10 flex items-center justify-center overflow-hidden"
                  style={{
                    height: "20px",
                    width: "100%",
                    position: "absolute",
                    inset: 0,
                    margin: "auto",
                  }}
                >
                  <div
                    className="flex items-center justify-center"
                    style={{ position: "relative" }}
                  >
                    {newTextChars.map((char, index) => (
                      <span
                        key={`new-${index}`}
                        className="char-item inline-block"
                        style={{
                          opacity: 0,
                          transform: "translateY(100%)",
                          whiteSpace: char === " " ? "pre" : "normal",
                          color: "#0000CC",
                          fontSize: "13px",
                          fontWeight: 700,
                          lineHeight: 1,
                          display: "inline-block",
                        }}
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                </div>
              </button>

              {/* Mobile Menu Toggle Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-full transition-colors"
                style={{
                  color: "#0000CC",
                  backgroundColor: isMobileMenuOpen
                    ? "rgba(0, 0, 204, 0.08)"
                    : "transparent",
                }}
                aria-label="Toggle menu"
                aria-expanded={isMobileMenuOpen}
                type="button"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5" strokeWidth={2.5} />
                ) : (
                  <Menu className="w-5 h-5" strokeWidth={2.5} />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 md:hidden header-fade-in"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div
            className="fixed top-0 left-0 right-0 z-40 md:hidden header-slide-down"
            style={{ paddingTop: "64px" }}
          >
            <div
              className="mx-4 rounded-2xl overflow-hidden"
              style={{
                backgroundColor: "#ffffff",
                boxShadow: "0 10px 40px rgba(0, 0, 0, 0.12)",
                border: "1px solid rgba(0, 0, 0, 0.05)",
              }}
            >
              <nav className="flex flex-col p-2">
                {[
                  { href: "/", label: "Home" },
                  { href: "/live-queue", label: "Live Queue" },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleMobileNavClick(item.href)}
                    className="flex items-center px-4 py-3 text-left rounded-xl transition-colors hover:bg-gray-50 active:bg-gray-100"
                    style={{
                      color: "#2A2D34",
                      fontFamily: "var(--font-plus-jakarta)",
                      fontSize: "15px",
                      fontWeight: 600,
                      letterSpacing: "0.02em",
                    }}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}

                {/* Divider */}
                <div className="h-px bg-gray-100 mx-2 my-2" />

                {/* Login Button */}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLoginClick();
                  }}
                  className="flex items-center justify-center px-4 py-3 rounded-xl transition-colors"
                  style={{
                    background: "#0000CC",
                    color: "#ffffff",
                    fontFamily: "var(--font-plus-jakarta)",
                    fontSize: "14px",
                    fontWeight: 700,
                    letterSpacing: "0.03em",
                  }}
                  type="button"
                >
                  Login
                </button>
              </nav>
            </div>
          </div>
        </>
      )}

      {/* Global animation styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes header-fade-in {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes header-slide-down {
              from {
                opacity: 0;
                transform: translateY(-12px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            .header-fade-in {
              animation: header-fade-in 0.2s ease-out;
            }
            .header-slide-down {
              animation: header-slide-down 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }
          `,
        }}
      />
    </div>
  );
}
