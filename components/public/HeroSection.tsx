// components/public/HeroSection.tsx
"use client";
import { Plus_Jakarta_Sans, Geist, Fraunces } from "next/font/google";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Building2, Wallet, FileText } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TransactionModal from "./TransactionModal";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  weight: ["400", "500", "600", "700"],
});
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});

interface HeroSectionProps {
  tagline?: string;
  imagePath?: string;
}

// Three separate transaction lists for each department
const DEAN_TRANSACTIONS = [
  { id: "grade-appeal", label: "Grade Appeal" },
  { id: "academic-concern", label: "Academic Concern" },
  { id: "course-approval", label: "Course Approval" },
  { id: "student-discipline", label: "Student Discipline" },
  { id: "faculty-concern", label: "Faculty Concern" },
  { id: "curriculum-review", label: "Curriculum Review" },
  { id: "academic-advisory", label: "Academic Advisory" },
];

const CASHIER_TRANSACTIONS = [
  { id: "tuition-payment", label: "Tuition Payment" },
  { id: "miscellaneous-fee", label: "Miscellaneous Fee Payment" },
  { id: "document-payment", label: "Document Payment" },
  { id: "other-school-fees", label: "Other School Fees" },
  { id: "assessment", label: "Assessment" },
];

const REGISTRAR_TRANSACTIONS = [
  { id: "certificate-enrollment", label: "Certificate of Enrollment" },
  { id: "transcript-records", label: "Transcript of Records" },
  { id: "request-grades", label: "Request for Grades" },
  { id: "request-assessment", label: "Request for Assessment" },
  { id: "good-moral", label: "Good Moral Certificate" },
  { id: "diploma", label: "Diploma" },
  { id: "other-document", label: "Other Document Request" },
];

const stats = [
  { value: "2.5K+", label: "Students Served" },
  { value: "5 min", label: "Average Wait Time" },
  { value: "6", label: "Active Counters" },
  { value: "97%", label: "Satisfaction Rate" },
];

export default function HeroSection({
  tagline = "Skip the Line. Save Your Time. BCC Cares.",
  imagePath = "/images/bcc-hero-2.jpg",
}: HeroSectionProps) {
  const wordsRef = useRef<HTMLHeadingElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(
    null,
  );
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(
    null,
  );
  const [deanPlaceholderIndex, setDeanPlaceholderIndex] = useState(0);
  const [cashierPlaceholderIndex, setCashierPlaceholderIndex] = useState(0);
  const [registrarPlaceholderIndex, setRegistrarPlaceholderIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const moundRef = useRef<HTMLDivElement>(null);
  const moundPathRef = useRef<SVGPathElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [notifications, setNotifications] = useState([
    { id: 1, name: "john doe", type: "next", visible: true },
    { id: 2, name: "maria santos", type: "confirmed", visible: true },
    { id: 3, name: "carlos garcia", type: "next", visible: true },
  ]);

  // Rotate placeholders for each dropdown
  useEffect(() => {
    if (isPaused || selectedTransaction) return;
    const interval = setInterval(() => {
      setDeanPlaceholderIndex((prev) => (prev + 1) % DEAN_TRANSACTIONS.length);
      setCashierPlaceholderIndex(
        (prev) => (prev + 1) % CASHIER_TRANSACTIONS.length,
      );
      setRegistrarPlaceholderIndex(
        (prev) => (prev + 1) % REGISTRAR_TRANSACTIONS.length,
      );
    }, 2500);
    return () => clearInterval(interval);
  }, [isPaused, selectedTransaction]);

  useEffect(() => {
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

  useEffect(() => {
    const SHOW_DURATION = 4200;
    const HIDE_DURATION = 2600;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const setVisible = (id: number, visible: boolean) =>
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, visible } : n)),
      );
    const scheduleHide = (id: number) => {
      timers.push(
        setTimeout(() => {
          setVisible(id, false);
          scheduleShow(id);
        }, SHOW_DURATION),
      );
    };
    const scheduleShow = (id: number) => {
      timers.push(
        setTimeout(() => {
          setVisible(id, true);
          scheduleHide(id);
        }, HIDE_DURATION),
      );
    };
    notifications.forEach((notif, index) => {
      timers.push(
        setTimeout(() => scheduleHide(notif.id), 3000 + index * 1600),
      );
    });
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, []);

  // Mound grow-on-scroll
  useEffect(() => {
    const moundPath = moundPathRef.current;
    const section = sectionRef.current;
    if (!moundPath || !section) return;

    const buildPath = (peakY: number) => {
      const shoulder = peakY + 120;
      return `M0,260 L0,${shoulder} Q360,${peakY} 720,${peakY} Q1080,${peakY} 1440,${shoulder} L1440,260 Z`;
    };

    moundPath.setAttribute("d", buildPath(60));

    const proxy = { peakY: 60 };

    const ctx = gsap.context(() => {
      gsap.to(proxy, {
        peakY: -80,
        ease: "power2.out",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom+=2200 top",
          scrub: 2.5,
          invalidateOnRefresh: true,
          onUpdate: () => {
            moundPath.setAttribute("d", buildPath(proxy.peakY));
          },
        },
      });
    });

    return () => ctx.revert();
  }, []);

  const [queueStatus, setQueueStatus] = useState<{
    status: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("@/actions/queue-status").then(({ getQueueAvailability }) =>
      getQueueAvailability().then((result) => {
        if (!cancelled && result.success) {
          setQueueStatus({ status: result.status, message: result.message });
        }
      }),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const handleTransactionSelect = (value: string, department: string) => {
    setSelectedTransaction(value);
    setSelectedDepartment(department);
    setIsPaused(true);
    setTimeout(() => {
      setIsModalOpen(true);
    }, 300);
  };

  const dismissNotification = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, visible: false } : n)),
    );
  };

  return (
    <>
      <section
        ref={sectionRef}
        className={`${plusJakarta.variable} ${geist.variable} ${fraunces.variable} relative overflow-hidden bg-white min-h-screen flex flex-col justify-center items-center`}
        style={{ marginBottom: 0, paddingBottom: 0 }}
      >
        {/* Mound */}
        <div
          ref={moundRef}
          className="absolute bottom-0 left-0 right-0 pointer-events-none z-0"
          style={{ height: "260px", marginBottom: 0 }}
        >
          <svg
            viewBox="0 0 1440 260"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "translateZ(0)",
              display: "block",
            }}
          >
            <path
              ref={moundPathRef}
              d="M0,260 L0,180 Q360,60 720,60 Q1080,60 1440,180 L1440,260 Z"
              fill="#0000CC"
            />
            <rect x="0" y="200" width="1440" height="60" fill="#0000CC" />
          </svg>
        </div>

        <div className="relative z-10 w-full max-w-4xl mx-auto px-6 md:px-12 lg:px-20 pt-16 pb-72 md:pb-64 text-center">
          {/* Live queue status pill */}
          {queueStatus && (
            <div className="mb-4 flex justify-center">
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                  queueStatus.status === "open"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-600 border border-red-200"
                }`}
                style={{ fontFamily: "var(--font-geist-sans)" }}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    queueStatus.status === "open"
                      ? "bg-green-500 animate-pulse"
                      : "bg-red-500"
                  }`}
                />
                {queueStatus.status === "open" ? "Queue Open" : "Queue Closed"}
              </span>
            </div>
          )}

          {/* Main Heading */}
          <div className="mb-6">
            <h1
              ref={wordsRef}
              className="m-0 p-0 leading-[1.05]"
              style={{
                fontSize: "clamp(28px, 4vw, 48px)",
                letterSpacing: "-0.03em",
                fontFamily: "var(--font-fraunces)",
                color: "#0000CC",
                fontWeight: 900,
              }}
            >
              Skip the Line. <br />
              Save Your Time.
            </h1>
          </div>

          {/* Description */}
          <div
            className="max-w-xl mx-auto mb-8"
            style={{
              animation: "fadeUp 0.6s ease forwards 0.3s",
              opacity: 0,
              transform: "translateY(10px)",
            }}
          >
            <p
              className="text-sm md:text-base"
              style={{
                fontFamily: "var(--font-geist-sans)",
                lineHeight: 1.6,
                color: "#2A2D34",
                fontWeight: 400,
              }}
            >
              Select a department and choose your transaction to get in line.
            </p>
          </div>

          {/* Three Dropdowns */}
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto"
            style={{
              animation: "fadeUp 0.6s ease forwards 0.5s",
              opacity: 0,
              transform: "translateY(10px)",
            }}
          >
            {/* Dean Dropdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Building2 className="w-4 h-4 text-[#0000CC]" />
                <span
                  className="text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  Dean's Office
                </span>
              </div>
              <Select
                value={selectedTransaction || undefined}
                onValueChange={(value) =>
                  handleTransactionSelect(value, "dean")
                }
                onOpenChange={(open) => setIsPaused(open)}
              >
                <SelectTrigger
                  className="w-full px-4 py-3 text-left rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  <SelectValue
                    placeholder={
                      <span className="text-gray-400 text-sm">
                        {DEAN_TRANSACTIONS[deanPlaceholderIndex]?.label}
                      </span>
                    }
                  />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-[#E5E7EB] shadow-xl max-h-[250px] overflow-y-auto">
                  {DEAN_TRANSACTIONS.map((item) => (
                    <SelectItem
                      key={item.id}
                      value={item.id}
                      className="py-2.5 px-4 cursor-pointer focus:bg-[#F8FAFC]"
                      style={{ fontFamily: "var(--font-geist-sans)" }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            selectedTransaction === item.id
                              ? "bg-[#0000CC]"
                              : "bg-[#D1D5DB]"
                          }`}
                        />
                        <span
                          className={`text-sm font-medium ${
                            selectedTransaction === item.id
                              ? "text-[#0000CC]"
                              : "text-[#0F172A]"
                          }`}
                        >
                          {item.label}
                        </span>
                        {selectedTransaction === item.id && (
                          <CheckCircle2 className="w-4 h-4 text-[#0000CC] ml-auto flex-shrink-0" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cashier Dropdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Wallet className="w-4 h-4 text-[#0000CC]" />
                <span
                  className="text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  Cashier
                </span>
              </div>
              <Select
                value={selectedTransaction || undefined}
                onValueChange={(value) =>
                  handleTransactionSelect(value, "cashier")
                }
                onOpenChange={(open) => setIsPaused(open)}
              >
                <SelectTrigger
                  className="w-full px-4 py-3 text-left rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  <SelectValue
                    placeholder={
                      <span className="text-gray-400 text-sm">
                        {CASHIER_TRANSACTIONS[cashierPlaceholderIndex]?.label}
                      </span>
                    }
                  />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-[#E5E7EB] shadow-xl max-h-[250px] overflow-y-auto">
                  {CASHIER_TRANSACTIONS.map((item) => (
                    <SelectItem
                      key={item.id}
                      value={item.id}
                      className="py-2.5 px-4 cursor-pointer focus:bg-[#F8FAFC]"
                      style={{ fontFamily: "var(--font-geist-sans)" }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            selectedTransaction === item.id
                              ? "bg-[#0000CC]"
                              : "bg-[#D1D5DB]"
                          }`}
                        />
                        <span
                          className={`text-sm font-medium ${
                            selectedTransaction === item.id
                              ? "text-[#0000CC]"
                              : "text-[#0F172A]"
                          }`}
                        >
                          {item.label}
                        </span>
                        {selectedTransaction === item.id && (
                          <CheckCircle2 className="w-4 h-4 text-[#0000CC] ml-auto flex-shrink-0" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Registrar Dropdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-4 h-4 text-[#0000CC]" />
                <span
                  className="text-xs font-semibold text-gray-600 uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  Registrar
                </span>
              </div>
              <Select
                value={selectedTransaction || undefined}
                onValueChange={(value) =>
                  handleTransactionSelect(value, "registrar")
                }
                onOpenChange={(open) => setIsPaused(open)}
              >
                <SelectTrigger
                  className="w-full px-4 py-3 text-left rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  <SelectValue
                    placeholder={
                      <span className="text-gray-400 text-sm">
                        {
                          REGISTRAR_TRANSACTIONS[registrarPlaceholderIndex]
                            ?.label
                        }
                      </span>
                    }
                  />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-[#E5E7EB] shadow-xl max-h-[250px] overflow-y-auto">
                  {REGISTRAR_TRANSACTIONS.map((item) => (
                    <SelectItem
                      key={item.id}
                      value={item.id}
                      className="py-2.5 px-4 cursor-pointer focus:bg-[#F8FAFC]"
                      style={{ fontFamily: "var(--font-geist-sans)" }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            selectedTransaction === item.id
                              ? "bg-[#0000CC]"
                              : "bg-[#D1D5DB]"
                          }`}
                        />
                        <span
                          className={`text-sm font-medium ${
                            selectedTransaction === item.id
                              ? "text-[#0000CC]"
                              : "text-[#0F172A]"
                          }`}
                        >
                          {item.label}
                        </span>
                        {selectedTransaction === item.id && (
                          <CheckCircle2 className="w-4 h-4 text-[#0000CC] ml-auto flex-shrink-0" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div
          ref={statsRef}
          className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center"
          style={{ height: "260px", marginBottom: 0, paddingBottom: 0 }}
        >
          <div className="w-full max-w-2xl px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center"
                style={{
                  animation: `fadeUp 0.6s ease forwards ${0.6 + index * 0.1}s`,
                  opacity: 0,
                  transform: "translateY(10px)",
                }}
              >
                <p
                  className="text-xl md:text-2xl font-bold text-white"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  {stat.value}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{
                    fontFamily: "var(--font-geist-sans)",
                    color: "rgba(255,255,255,0.65)",
                  }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes fadeUp {
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0);   }
          }
          @keyframes floatNotif {
            0%   { transform: translateY(0px);  }
            100% { transform: translateY(-6px); }
          }
          .animate-fadeIn {
            animation: fadeIn 0.4s ease forwards;
          }
        `}</style>
      </section>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTransaction(null);
          setSelectedDepartment(null);
        }}
        initialTransaction={selectedTransaction}
        department={selectedDepartment}
      />
    </>
  );
}
