// components/public/FeatureSection.tsx
"use client";

import { Plus_Jakarta_Sans } from "next/font/google";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

interface Feature {
  description: string;
  align: "left" | "right";
  hasGraph?: boolean;
  hasSMSAnimation?: boolean;
  hasTicketAnimation?: boolean;
  hasMonitorAnimation?: boolean;
  hasCounterAnimation?: boolean;
}

const features: Feature[] = [
  {
    description: "Real-time queue tracking with live wait time updates",
    align: "left",
    hasMonitorAnimation: true,
  },
  {
    description: "Digital ticketing system — join queues without paper",
    align: "right",
    hasTicketAnimation: true,
  },
  {
    description: "SMS & Email notifications when your turn is approaching",
    align: "left",
    hasSMSAnimation: true,
  },
  {
    description: "Service analytics to monitor performance and efficiency",
    align: "right",
    hasGraph: true,
  },
  {
    description: "Multi-counter support to reduce bottlenecks and wait times",
    align: "left",
    hasCounterAnimation: true,
  },
];

// Mock data for the graph
const graphData = [
  { time: "9:00", value: 12 },
  { time: "10:00", value: 28 },
  { time: "11:00", value: 45 },
  { time: "12:00", value: 32 },
  { time: "13:00", value: 18 },
  { time: "14:00", value: 35 },
  { time: "15:00", value: 52 },
  { time: "16:00", value: 38 },
  { time: "17:00", value: 22 },
];

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<(HTMLDivElement | null)[]>([]);
  const textRef = useRef<(HTMLParagraphElement | null)[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const smsContainerRef = useRef<HTMLDivElement>(null);
  const ticketContainerRef = useRef<HTMLDivElement>(null);
  const monitorContainerRef = useRef<HTMLDivElement>(null);
  const counterContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [currentTicket, setCurrentTicket] = useState({
    number: 42,
    student: "Maria Santos",
    counter: 2,
    date: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });
  const [isSpinning, setIsSpinning] = useState(false);

  const [liveData, setLiveData] = useState({
    totalQueue: 42,
    waiting: 15,
    beingServed: 8,
    avgWaitTime: "4.5",
    counters: [
      {
        id: 1,
        name: "Counter 1",
        status: "available",
        current: null,
        waitTime: 0,
      },
      {
        id: 2,
        name: "Counter 2",
        status: "serving",
        current: "Maria S.",
        waitTime: 2,
      },
      {
        id: 3,
        name: "Counter 3",
        status: "serving",
        current: "John D.",
        waitTime: 5,
      },
      {
        id: 4,
        name: "Counter 4",
        status: "available",
        current: null,
        waitTime: 0,
      },
      {
        id: 5,
        name: "Counter 5",
        status: "serving",
        current: "Carlos G.",
        waitTime: 3,
      },
      {
        id: 6,
        name: "Counter 6",
        status: "available",
        current: null,
        waitTime: 0,
      },
    ],
  });

  // Slot machine ticket generation
  useEffect(() => {
    if (!ticketContainerRef.current) return;

    const interval = setInterval(() => {
      setIsSpinning(true);

      // Simulate slot machine spinning
      setTimeout(() => {
        const newNumber = Math.floor(Math.random() * 100) + 1;
        const students = [
          "Maria Santos",
          "John Doe",
          "Carlos Garcia",
          "Anna Reyes",
          "Mark Cruz",
          "Lisa Tan",
        ];
        const randomStudent =
          students[Math.floor(Math.random() * students.length)];
        const randomCounter = Math.floor(Math.random() * 6) + 1;

        setCurrentTicket({
          number: newNumber,
          student: randomStudent,
          counter: randomCounter,
          date: new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          time: new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        });

        setIsSpinning(false);
      }, 1500);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const dot = dotRef.current;
      const section = sectionRef.current;
      if (!dot || !section) return;

      // Heading animation
      gsap.from(headingRef.current, {
        scrollTrigger: {
          trigger: headingRef.current,
          start: "top 85%",
          end: "top 30%",
          toggleActions: "play none none reverse",
          scrub: 0.5,
        },
        y: 60,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
      });

      const boxes = boxRef.current.filter(
        (el): el is HTMLDivElement => el !== null,
      );
      if (boxes.length === 0) return;

      // Dot anchored by its own center, fully hidden until first jump
      gsap.set(dot, { xPercent: -50, yPercent: -50, scale: 0, opacity: 0 });

      let hasAppeared = false;
      let current = { x: 0, y: 0 };

      const getDotTarget = (box: HTMLDivElement) => {
        const r = box.getBoundingClientRect();
        const s = section.getBoundingClientRect();

        const index = boxRef.current.indexOf(box);

        // For features with animations on the right, target the text column
        if (index === 1 || index === 3) {
          const textEl = textRef.current[index];
          if (textEl) {
            const textRect = textEl.getBoundingClientRect();
            return {
              x: textRect.left - s.left + textRect.width / 2,
              y: textRect.top - s.top - 28,
            };
          }
        }

        // For features with animations on the left, target the text column
        if (index === 0 || index === 2 || index === 4) {
          const textEl = textRef.current[index];
          if (textEl) {
            const textRect = textEl.getBoundingClientRect();
            return {
              x: textRect.left - s.left + textRect.width / 2,
              y: textRect.top - s.top - 28,
            };
          }
        }

        return {
          x: r.left - s.left + r.width / 2,
          y: r.top - s.top - 28,
        };
      };

      const getCenterTarget = () => {
        const s = section.getBoundingClientRect();
        return { x: s.width / 2, y: s.height / 2 };
      };

      const hop = (
        toX: number,
        toY: number,
        opts: { fadeOut?: boolean } = {},
      ) => {
        gsap.killTweensOf(dot);
        const tl = gsap.timeline();

        if (!hasAppeared) {
          hasAppeared = true;
          tl.set(dot, { x: toX, y: toY })
            .to(dot, { opacity: 1, duration: 0.2, ease: "power1.out" }, 0)
            .fromTo(
              dot,
              { scale: 0 },
              { scale: 1, duration: 0.45, ease: "back.out(2.4)" },
              0,
            );
          current = { x: toX, y: toY };
          return tl;
        }

        const fromX = current.x;
        const fromY = current.y;
        const dist = Math.hypot(toX - fromX, toY - fromY);
        const dur = gsap.utils.clamp(0.32, 0.6, 0.32 + dist / 900);
        const arc = gsap.utils.clamp(40, 90, dist * 0.25);
        const peakY = Math.min(fromY, toY) - arc;

        tl.to(dot, {
          scaleX: 1.25,
          scaleY: 0.7,
          duration: 0.1,
          ease: "power1.out",
        })
          .addLabel("flight", "-=0.02")
          .to(dot, { x: toX, duration: dur, ease: "none" }, "flight")
          .to(
            dot,
            { y: peakY, duration: dur * 0.45, ease: "power2.out" },
            "flight",
          )
          .to(
            dot,
            { y: toY, duration: dur * 0.55, ease: "power2.in" },
            `flight+=${dur * 0.45}`,
          )
          .to(
            dot,
            {
              scaleY: 1.3,
              scaleX: 0.8,
              duration: dur * 0.5,
              ease: "sine.inOut",
            },
            "flight",
          )
          .to(
            dot,
            { scaleY: 1, scaleX: 1, duration: dur * 0.5, ease: "sine.inOut" },
            `flight+=${dur * 0.5}`,
          )
          .to(
            dot,
            { scaleX: 1.3, scaleY: 0.6, duration: 0.08, ease: "power1.out" },
            `flight+=${dur - 0.02}`,
          )
          .to(dot, {
            scaleX: 1,
            scaleY: 1,
            duration: 0.32,
            ease: "elastic.out(1, 0.5)",
          });

        if (opts.fadeOut) {
          tl.to(
            dot,
            { opacity: 0, scale: 0, duration: 0.3, ease: "power2.in" },
            "-=0.15",
          );
        }

        current = { x: toX, y: toY };
        return tl;
      };

      const fadeOutDot = () => {
        gsap.killTweensOf(dot);
        gsap.to(dot, {
          opacity: 0,
          scale: 0,
          duration: 0.3,
          ease: "power2.in",
        });
        hasAppeared = false;
      };

      boxes.forEach((box, index) => {
        const isLeft = features[index]?.align === "left";
        const text = textRef.current[index];

        if (text) {
          gsap.from(text, {
            scrollTrigger: {
              trigger: box,
              start: "top 90%",
              end: "top 40%",
              toggleActions: "play none none reverse",
              scrub: 0.5,
              invalidateOnRefresh: true,
            },
            x: isLeft ? -60 : 60,
            duration: 0.8,
            ease: "power3.out",
          });
        }

        ScrollTrigger.create({
          trigger: box,
          start: "top 55%",
          end: "bottom 45%",
          invalidateOnRefresh: true,
          onEnter: () => {
            setActiveIndex(index);
            const { x, y } = getDotTarget(box);
            hop(x, y);
          },
          onEnterBack: () => {
            setActiveIndex(index);
            const { x, y } = getDotTarget(box);
            hop(x, y);
          },
        });
      });

      ScrollTrigger.create({
        trigger: section,
        start: "bottom bottom",
        onEnter: () => {
          fadeOutDot();
        },
        onEnterBack: () => {
          const lastIndex = boxes.length - 1;
          setActiveIndex(lastIndex);
          const { x, y } = getDotTarget(boxes[lastIndex]);
          hasAppeared = false;
          hop(x, y);
        },
      });

      let lastScrollY = window.scrollY;
      let lastDirection = 0;

      const handleScroll = () => {
        const currentScrollY = window.scrollY;
        const direction = currentScrollY > lastScrollY ? 1 : -1;
        lastScrollY = currentScrollY;

        if (direction !== lastDirection) {
          lastDirection = direction;
        }
      };

      window.addEventListener("scroll", handleScroll, { passive: true });

      return () => {
        window.removeEventListener("scroll", handleScroll);
      };

      if (endRef.current) {
        ScrollTrigger.create({
          trigger: endRef.current,
          start: "top 75%",
          invalidateOnRefresh: true,
          onEnter: () => {
            setActiveIndex(-1);
            const { x, y } = getCenterTarget();
            hop(x, y, { fadeOut: true });
          },
          onLeaveBack: () => {
            const lastIndex = boxes.length - 1;
            setActiveIndex(lastIndex);
            const { x, y } = getDotTarget(boxes[lastIndex]);
            hasAppeared = false;
            hop(x, y);
          },
        });
      }

      ScrollTrigger.refresh();
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      ScrollTrigger.refresh();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Graph animation effect
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const path = svg.querySelector("path.line-path") as SVGPathElement | null;
    if (!path) return;

    const length = path.getTotalLength();
    path.style.strokeDasharray = length.toString();
    path.style.strokeDashoffset = length.toString();

    const ctx = gsap.context(() => {
      gsap.to(path, {
        strokeDashoffset: 0,
        duration: 2,
        ease: "power2.inOut",
        scrollTrigger: {
          trigger: graphRef.current,
          start: "top 85%",
          end: "top 40%",
          toggleActions: "play none none reverse",
          scrub: 1,
        },
      });

      const area = svg.querySelector(".area-fill") as SVGPathElement | null;
      if (area) {
        gsap.from(area, {
          opacity: 0,
          duration: 2,
          ease: "power2.inOut",
          scrollTrigger: {
            trigger: graphRef.current,
            start: "top 85%",
            end: "top 40%",
            toggleActions: "play none none reverse",
            scrub: 1,
          },
        });
      }

      const circles = svg.querySelectorAll("circle");
      gsap.from(circles, {
        scale: 0,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "back.out(2)",
        scrollTrigger: {
          trigger: graphRef.current,
          start: "top 85%",
          end: "top 40%",
          toggleActions: "play none none reverse",
          scrub: 1,
        },
      });
    }, graphRef);

    return () => ctx.revert();
  }, []);

  // SMS Animation effect
  useEffect(() => {
    if (!smsContainerRef.current) return;

    const ctx = gsap.context(() => {
      const messages =
        smsContainerRef.current?.querySelectorAll(".sms-message");
      if (!messages) return;

      gsap.set(messages, {
        opacity: 0,
        scale: 0.8,
        y: 20,
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: smsContainerRef.current,
          start: "top 85%",
          end: "top 40%",
          toggleActions: "play none none reverse",
        },
      });

      tl.to(messages, {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.4,
        ease: "back.out(1.7)",
      });

      messages.forEach((msg, i) => {
        gsap.to(msg, {
          y: -5,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.3,
          scrollTrigger: {
            trigger: smsContainerRef.current,
            start: "top 80%",
            end: "top 30%",
            toggleActions: "play none none reverse",
          },
        });
      });
    }, smsContainerRef);

    return () => ctx.revert();
  }, []);

  // Monitor Animation effect
  useEffect(() => {
    if (!monitorContainerRef.current) return;

    const ctx = gsap.context(() => {
      const monitorItems =
        monitorContainerRef.current?.querySelectorAll(".monitor-item");
      if (!monitorItems) return;

      gsap.set(monitorItems, {
        opacity: 0,
        scale: 0.9,
        y: 15,
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: monitorContainerRef.current,
          start: "top 85%",
          end: "top 40%",
          toggleActions: "play none none reverse",
        },
      });

      tl.to(monitorItems, {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.15,
        ease: "power2.out",
      });

      const stats = monitorContainerRef.current?.querySelectorAll(".stat-item");
      if (stats) {
        stats.forEach((stat, i) => {
          gsap.to(stat, {
            y: -3,
            duration: 2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: i * 0.2,
            scrollTrigger: {
              trigger: monitorContainerRef.current,
              start: "top 80%",
              end: "top 30%",
              toggleActions: "play none none reverse",
            },
          });
        });
      }
    }, monitorContainerRef);

    return () => ctx.revert();
  }, []);

  // Counter Animation effect
  useEffect(() => {
    if (!counterContainerRef.current) return;

    const ctx = gsap.context(() => {
      const counterItems =
        counterContainerRef.current?.querySelectorAll(".counter-item");
      if (!counterItems) return;

      gsap.set(counterItems, {
        opacity: 0,
        scale: 0.9,
        x: -30,
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: counterContainerRef.current,
          start: "top 85%",
          end: "top 40%",
          toggleActions: "play none none reverse",
        },
      });

      tl.to(counterItems, {
        opacity: 1,
        scale: 1,
        x: 0,
        duration: 0.6,
        stagger: 0.15,
        ease: "back.out(1.7)",
      });

      // Add subtle floating animation
      counterItems.forEach((item, i) => {
        gsap.to(item, {
          y: -4,
          duration: 2.5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.2,
          scrollTrigger: {
            trigger: counterContainerRef.current,
            start: "top 80%",
            end: "top 30%",
            toggleActions: "play none none reverse",
          },
        });
      });
    }, counterContainerRef);

    return () => ctx.revert();
  }, []);

  // Live data update simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveData((prev) => ({
        ...prev,
        totalQueue: prev.totalQueue + Math.floor(Math.random() * 3) - 1,
        waiting: Math.max(0, prev.waiting + Math.floor(Math.random() * 2) - 1),
        beingServed: Math.max(
          0,
          Math.min(10, prev.beingServed + Math.floor(Math.random() * 2) - 1),
        ),
        avgWaitTime: (
          parseFloat(prev.avgWaitTime) +
          (Math.random() * 0.4 - 0.2)
        ).toFixed(1),
        counters: prev.counters.map((counter) => ({
          ...counter,
          status: Math.random() > 0.7 ? "available" : counter.status,
          waitTime:
            counter.status === "serving"
              ? Math.floor(Math.random() * 5) + 1
              : 0,
        })),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="features-section"
      ref={sectionRef}
      className={`${plusJakarta.variable} relative bg-[#0000CC] min-h-screen py-20 md:py-28 flex items-center overflow-hidden`}
    >
      {/* White Dot */}
      <div
        ref={dotRef}
        className="absolute w-4 h-4 md:w-5 md:h-5 rounded-full bg-white shadow-lg shadow-white/50 pointer-events-none"
        style={{
          top: 0,
          left: 0,
          willChange: "transform",
        }}
      />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-10">
        {/* Heading */}
        <div ref={headingRef} className="text-center mb-24 md:mb-32">
          <h2
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight leading-tight"
            style={{ fontFamily: "var(--font-plus-jakarta)" }}
          >
            Smarter Queue. <br />
            <span className="text-white/80">Better Service.</span>
          </h2>
          <p
            className="text-white/40 text-sm max-w-xl mx-auto leading-relaxed"
            style={{ fontFamily: "var(--font-plus-jakarta)" }}
          >
            Everything you need to manage queues efficiently, all in one place.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-16 md:space-y-20 lg:space-y-24">
          {features.map((feature, index) => {
            // Service Analytics with graph
            if (feature.hasGraph && feature.align === "right") {
              return (
                <div
                  key={index}
                  ref={(el) => {
                    boxRef.current[index] = el;
                  }}
                  className="w-full"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
                    {/* Graph - Left Column */}
                    <div ref={graphRef} className="w-full">
                      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/10">
                        <h4 className="text-white/60 text-xs uppercase tracking-wider mb-4 font-medium">
                          Today's Queue Activity
                        </h4>
                        <svg
                          ref={svgRef}
                          viewBox="0 0 400 200"
                          className="w-full h-auto"
                          preserveAspectRatio="xMidYMid meet"
                        >
                          <line
                            x1="40"
                            y1="30"
                            x2="40"
                            y2="170"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="1"
                          />
                          <line
                            x1="40"
                            y1="170"
                            x2="370"
                            y2="170"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="1"
                          />

                          <text
                            x="30"
                            y="175"
                            fill="rgba(255,255,255,0.3)"
                            fontSize="8"
                            textAnchor="end"
                          >
                            0
                          </text>
                          <text
                            x="30"
                            y="130"
                            fill="rgba(255,255,255,0.3)"
                            fontSize="8"
                            textAnchor="end"
                          >
                            15
                          </text>
                          <text
                            x="30"
                            y="85"
                            fill="rgba(255,255,255,0.3)"
                            fontSize="8"
                            textAnchor="end"
                          >
                            30
                          </text>
                          <text
                            x="30"
                            y="40"
                            fill="rgba(255,255,255,0.3)"
                            fontSize="8"
                            textAnchor="end"
                          >
                            45
                          </text>
                          <text
                            x="30"
                            y="15"
                            fill="rgba(255,255,255,0.3)"
                            fontSize="8"
                            textAnchor="end"
                          >
                            60
                          </text>

                          <path
                            className="area-fill"
                            d={`
                              M 40,170
                              ${graphData
                                .map((d, i) => {
                                  const x =
                                    40 + (i / (graphData.length - 1)) * 330;
                                  const y = 170 - (d.value / 60) * 140;
                                  return `L ${x},${y}`;
                                })
                                .join(" ")}
                              L ${40 + 330},170
                              Z
                            `}
                            fill="rgba(255,255,255,0.08)"
                          />

                          <path
                            className="line-path"
                            d={`
                              M 40,${170 - (graphData[0].value / 60) * 140}
                              ${graphData
                                .slice(1)
                                .map((d, i) => {
                                  const x =
                                    40 +
                                    ((i + 1) / (graphData.length - 1)) * 330;
                                  const y = 170 - (d.value / 60) * 140;
                                  return `L ${x},${y}`;
                                })
                                .join(" ")}
                            `}
                            fill="none"
                            stroke="white"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {graphData.map((d, i) => {
                            const x = 40 + (i / (graphData.length - 1)) * 330;
                            const y = 170 - (d.value / 60) * 140;
                            return (
                              <circle
                                key={i}
                                cx={x}
                                cy={y}
                                r="4"
                                fill="white"
                                className="graph-point"
                                style={{ opacity: 0 }}
                              >
                                <animate
                                  attributeName="r"
                                  values="4;6;4"
                                  dur="2s"
                                  repeatCount="indefinite"
                                />
                                <animate
                                  attributeName="opacity"
                                  values="0.8;1;0.8"
                                  dur="2s"
                                  repeatCount="indefinite"
                                />
                              </circle>
                            );
                          })}

                          {graphData.map((d, i) => {
                            const x = 40 + (i / (graphData.length - 1)) * 330;
                            return (
                              <text
                                key={i}
                                x={x}
                                y="190"
                                fill="rgba(255,255,255,0.3)"
                                fontSize="7"
                                textAnchor="middle"
                              >
                                {d.time}
                              </text>
                            );
                          })}
                        </svg>

                        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5">
                          <div>
                            <p className="text-white/40 text-[10px]">Peak</p>
                            <p className="text-white font-semibold text-sm">
                              52
                            </p>
                          </div>
                          <div>
                            <p className="text-white/40 text-[10px]">Average</p>
                            <p className="text-white font-semibold text-sm">
                              31
                            </p>
                          </div>
                          <div>
                            <p className="text-white/40 text-[10px]">Total</p>
                            <p className="text-white font-semibold text-sm">
                              282
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p
                        ref={(el) => {
                          textRef.current[index] = el;
                        }}
                        className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight"
                        style={{ fontFamily: "var(--font-plus-jakarta)" }}
                      >
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            // SMS feature with animation
            if (feature.hasSMSAnimation && feature.align === "left") {
              return (
                <div
                  key={index}
                  ref={(el) => {
                    boxRef.current[index] = el;
                  }}
                  className="w-full"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                    <div>
                      <p
                        ref={(el) => {
                          textRef.current[index] = el;
                        }}
                        className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight"
                        style={{ fontFamily: "var(--font-plus-jakarta)" }}
                      >
                        {feature.description}
                      </p>
                    </div>

                    <div ref={smsContainerRef} className="w-full">
                      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/10">
                        <h4 className="text-white/60 text-xs uppercase tracking-wider mb-4 font-medium">
                          Message Queue
                        </h4>
                        <div className="space-y-3">
                          <div className="sms-message flex items-start gap-3 bg-white/10 rounded-lg p-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                              <svg
                                className="w-4 h-4 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-white text-sm font-medium">
                                John Doe
                              </p>
                              <p className="text-white/60 text-xs">
                                Your turn is approaching. Please proceed to
                                Counter 3.
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-white/40 text-[10px]">
                                  2 min ago
                                </span>
                                <span className="text-white/60 text-[10px]">
                                  ✓ Sent
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="sms-message flex items-start gap-3 bg-white/10 rounded-lg p-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                              <svg
                                className="w-4 h-4 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-white text-sm font-medium">
                                Maria Santos
                              </p>
                              <p className="text-white/60 text-xs">
                                Your slot is confirmed. Estimated wait: 5
                                minutes.
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-white/40 text-[10px]">
                                  Just now
                                </span>
                                <span className="text-white/40 text-[10px] flex items-center gap-1">
                                  <span className="inline-block w-2 h-2 rounded-full bg-white/40 animate-pulse"></span>
                                  Sending...
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="sms-message flex items-start gap-3 bg-white/10 rounded-lg p-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                              <svg
                                className="w-4 h-4 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-white text-sm font-medium">
                                Carlos Garcia
                              </p>
                              <p className="text-white/60 text-xs">
                                Your queue number is #42. 3 people ahead of you.
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-white/40 text-[10px]">
                                  5 min ago
                                </span>
                                <span className="text-white/60 text-[10px]">
                                  ✓ Delivered
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="sms-message flex items-center justify-center gap-2 text-white/40 text-xs">
                            <span className="inline-block w-2 h-2 rounded-full bg-white/40 animate-bounce"></span>
                            <span
                              className="inline-block w-2 h-2 rounded-full bg-white/40 animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            ></span>
                            <span
                              className="inline-block w-2 h-2 rounded-full bg-white/40 animate-bounce"
                              style={{ animationDelay: "0.4s" }}
                            ></span>
                            <span className="ml-1">Sending messages...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // Digital Ticket feature - Email template style
            if (feature.hasTicketAnimation && feature.align === "right") {
              return (
                <div
                  key={index}
                  ref={(el) => {
                    boxRef.current[index] = el;
                  }}
                  className="w-full"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                    {/* Ticket Animation - Left Column */}
                    <div ref={ticketContainerRef} className="w-full">
                      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-white/60 text-xs uppercase tracking-wider font-medium">
                            Ticket Generator
                          </h4>
                          <span className="flex items-center gap-1.5">
                            <span
                              className={`inline-block w-2 h-2 rounded-full ${isSpinning ? "bg-white/60 animate-pulse" : "bg-white/40"}`}
                            ></span>
                            <span className="text-white/40 text-[10px]">
                              {isSpinning ? "Generating..." : "Ready"}
                            </span>
                          </span>
                        </div>

                        <div className="space-y-4">
                          {/* Email Template Ticket */}
                          <div
                            className={`ticket-item relative transition-all duration-700 ${isSpinning ? "scale-95 opacity-70" : "scale-100 opacity-100"}`}
                          >
                            <div className="border-2 border-white/30 rounded-xl bg-white/5 backdrop-blur-sm overflow-hidden shadow-2xl">
                              {/* Email Header */}
                              <div className="bg-white/10 px-4 py-2 border-b border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center">
                                    <svg
                                      className="w-3 h-3 text-white"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                      />
                                    </svg>
                                  </div>
                                  <span className="text-white/60 text-[10px] font-medium">
                                    Queue Ticket Confirmation
                                  </span>
                                </div>
                                <span className="text-white/30 text-[8px]">
                                  #BCC-
                                  {String(currentTicket.number).padStart(
                                    4,
                                    "0",
                                  )}
                                </span>
                              </div>

                              {/* Email Body */}
                              <div className="px-4 py-3">
                                {/* Ticket Number */}
                                <div className="text-center mb-3">
                                  <div className="text-4xl font-black text-white font-mono tracking-wider">
                                    #{" "}
                                    {String(currentTicket.number).padStart(
                                      3,
                                      "0",
                                    )}
                                  </div>
                                  <div className="text-white/30 text-[8px] uppercase tracking-wider mt-0.5">
                                    Ticket Number
                                  </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-white/10 my-2"></div>

                                {/* Ticket Details */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <p className="text-white/30 text-[8px] uppercase tracking-wider">
                                      Student
                                    </p>
                                    <p className="text-white font-medium text-sm">
                                      {currentTicket.student}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-white/30 text-[8px] uppercase tracking-wider">
                                      Counter
                                    </p>
                                    <p className="text-white font-medium text-sm">
                                      #{currentTicket.counter}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-white/30 text-[8px] uppercase tracking-wider">
                                      Date
                                    </p>
                                    <p className="text-white/80 text-xs">
                                      {currentTicket.date}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-white/30 text-[8px] uppercase tracking-wider">
                                      Time
                                    </p>
                                    <p className="text-white/80 text-xs">
                                      {currentTicket.time}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Email Footer */}
                              <div className="bg-white/5 px-4 py-2 border-t border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-white/20 text-[8px]">
                                    ✓ Confirmed
                                  </span>
                                  <span className="w-px h-3 bg-white/10"></span>
                                  <span className="text-white/20 text-[8px]">
                                    BCC Queue System
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <div className="w-5 h-5 bg-white/10 rounded flex items-center justify-center">
                                    <span className="text-white/30 text-[6px] font-bold">
                                      BCC
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Status Indicator */}
                          <div className="flex items-center justify-center gap-3 text-white/40 text-xs">
                            <span
                              className={`inline-block w-2 h-2 rounded-full ${isSpinning ? "bg-white/60 animate-spin" : "bg-white/40"}`}
                            ></span>
                            <span className="flex items-center gap-1">
                              {isSpinning
                                ? "Generating ticket..."
                                : "Ticket ready"}
                            </span>
                            <span className="text-white/20 text-[10px]">
                              Auto-generates every 5s
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Text - Right Column */}
                    <div>
                      <p
                        ref={(el) => {
                          textRef.current[index] = el;
                        }}
                        className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight"
                        style={{ fontFamily: "var(--font-plus-jakarta)" }}
                      >
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            // Monitor feature - Right side
            if (feature.hasMonitorAnimation && feature.align === "left") {
              return (
                <div
                  key={index}
                  ref={(el) => {
                    boxRef.current[index] = el;
                  }}
                  className="w-full"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                    {/* Text - Left Column */}
                    <div>
                      <p
                        ref={(el) => {
                          textRef.current[index] = el;
                        }}
                        className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight"
                        style={{ fontFamily: "var(--font-plus-jakarta)" }}
                      >
                        {feature.description}
                      </p>
                    </div>

                    {/* Monitor - Right Column */}
                    <div ref={monitorContainerRef} className="w-full">
                      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-white/60 text-xs uppercase tracking-wider font-medium">
                            Live Queue Monitor
                          </h4>
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-white/60 animate-pulse"></span>
                            <span className="text-white/40 text-[10px]">
                              Live
                            </span>
                          </span>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-4 gap-2 mb-4">
                          <div className="stat-item bg-white/5 rounded-lg p-2 text-center">
                            <p className="text-white/40 text-[8px]">
                              Total Queue
                            </p>
                            <p className="text-white font-bold text-lg">
                              {liveData.totalQueue}
                            </p>
                          </div>
                          <div className="stat-item bg-white/5 rounded-lg p-2 text-center">
                            <p className="text-white/40 text-[8px]">Waiting</p>
                            <p className="text-white font-bold text-lg">
                              {liveData.waiting}
                            </p>
                          </div>
                          <div className="stat-item bg-white/5 rounded-lg p-2 text-center">
                            <p className="text-white/40 text-[8px]">
                              Being Served
                            </p>
                            <p className="text-white font-bold text-lg">
                              {liveData.beingServed}
                            </p>
                          </div>
                          <div className="stat-item bg-white/5 rounded-lg p-2 text-center">
                            <p className="text-white/40 text-[8px]">Avg Wait</p>
                            <p className="text-white font-bold text-lg">
                              {liveData.avgWaitTime}m
                            </p>
                          </div>
                        </div>

                        {/* Counter Status */}
                        <div className="space-y-1.5">
                          <p className="text-white/40 text-[10px] font-medium">
                            Active Counters
                          </p>
                          {liveData.counters.map((counter) => (
                            <div
                              key={counter.id}
                              className="monitor-item flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-white/40 text-xs font-medium">
                                  {counter.name}
                                </span>
                                <span
                                  className={`text-[8px] font-medium px-2 py-0.5 rounded-full ${
                                    counter.status === "available"
                                      ? "bg-white/20 text-white/60"
                                      : "bg-white/10 text-white/40"
                                  }`}
                                >
                                  {counter.status === "available"
                                    ? "Available"
                                    : "Serving"}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                {counter.status === "serving" && (
                                  <>
                                    <span className="text-white/60 text-xs">
                                      {counter.current}
                                    </span>
                                    <span className="text-white/40 text-[10px]">
                                      {counter.waitTime}m
                                    </span>
                                  </>
                                )}
                                {counter.status === "available" && (
                                  <span className="text-white/20 text-[10px]">
                                    Ready
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Live indicator */}
                        <div className="monitor-item flex items-center justify-center gap-2 mt-3 pt-3 border-t border-white/5 text-white/30 text-[10px]">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse"></span>
                          <span>Updating in real-time</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // Multi-counter feature with animation - All White
            if (feature.hasCounterAnimation && feature.align === "left") {
              return (
                <div
                  key={index}
                  ref={(el) => {
                    boxRef.current[index] = el;
                  }}
                  className="w-full"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                    {/* Text - Left Column */}
                    <div>
                      <p
                        ref={(el) => {
                          textRef.current[index] = el;
                        }}
                        className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight"
                        style={{ fontFamily: "var(--font-plus-jakarta)" }}
                      >
                        {feature.description}
                      </p>
                    </div>

                    {/* Counter Animation - Right Column */}
                    <div ref={counterContainerRef} className="w-full">
                      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-white/10">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-white/60 text-xs uppercase tracking-wider font-medium">
                            Multi-Counter System
                          </h4>
                          <span className="flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-white/60 animate-pulse"></span>
                            <span className="text-white/40 text-[10px]">
                              Active
                            </span>
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {/* Counter 1 */}
                          <div className="counter-item bg-white/5 rounded-lg p-3 border border-white/10 hover:border-white/30 transition-all">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white/60 text-xs font-medium">
                                Counter 1
                              </span>
                              <span className="w-2 h-2 rounded-full bg-white/40 animate-pulse"></span>
                            </div>
                            <p className="text-white/40 text-[10px]">
                              Available
                            </p>
                            <div className="mt-1 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full w-0 bg-white/40 rounded-full animate-[width_2s_ease-in-out_infinite]"></div>
                            </div>
                          </div>

                          {/* Counter 2 */}
                          <div className="counter-item bg-white/5 rounded-lg p-3 border border-white/10 hover:border-white/30 transition-all">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white/60 text-xs font-medium">
                                Counter 2
                              </span>
                              <span className="w-2 h-2 rounded-full bg-white/60 animate-pulse"></span>
                            </div>
                            <p className="text-white/60 text-[10px]">
                              Maria S.
                            </p>
                            <div className="mt-1 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full w-3/4 bg-white/40 rounded-full"></div>
                            </div>
                          </div>

                          {/* Counter 3 */}
                          <div className="counter-item bg-white/5 rounded-lg p-3 border border-white/10 hover:border-white/30 transition-all">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white/60 text-xs font-medium">
                                Counter 3
                              </span>
                              <span className="w-2 h-2 rounded-full bg-white/60 animate-pulse"></span>
                            </div>
                            <p className="text-white/60 text-[10px]">John D.</p>
                            <div className="mt-1 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full w-1/2 bg-white/40 rounded-full"></div>
                            </div>
                          </div>

                          {/* Counter 4 */}
                          <div className="counter-item bg-white/5 rounded-lg p-3 border border-white/10 hover:border-white/30 transition-all">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white/60 text-xs font-medium">
                                Counter 4
                              </span>
                              <span className="w-2 h-2 rounded-full bg-white/40 animate-pulse"></span>
                            </div>
                            <p className="text-white/40 text-[10px]">
                              Available
                            </p>
                            <div className="mt-1 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full w-0 bg-white/40 rounded-full animate-[width_2s_ease-in-out_infinite]"></div>
                            </div>
                          </div>

                          {/* Counter 5 */}
                          <div className="counter-item bg-white/5 rounded-lg p-3 border border-white/10 hover:border-white/30 transition-all">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white/60 text-xs font-medium">
                                Counter 5
                              </span>
                              <span className="w-2 h-2 rounded-full bg-white/60 animate-pulse"></span>
                            </div>
                            <p className="text-white/60 text-[10px]">
                              Carlos G.
                            </p>
                            <div className="mt-1 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full w-2/3 bg-white/40 rounded-full"></div>
                            </div>
                          </div>

                          {/* Counter 6 */}
                          <div className="counter-item bg-white/5 rounded-lg p-3 border border-white/10 hover:border-white/30 transition-all">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white/60 text-xs font-medium">
                                Counter 6
                              </span>
                              <span className="w-2 h-2 rounded-full bg-white/40 animate-pulse"></span>
                            </div>
                            <p className="text-white/40 text-[10px]">
                              Available
                            </p>
                            <div className="mt-1 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full w-0 bg-white/40 rounded-full animate-[width_2s_ease-in-out_infinite]"></div>
                            </div>
                          </div>
                        </div>

                        {/* Status indicator - All White */}
                        <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-white/5 text-white/30 text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-white/40"></span>
                            <span>Available</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-white/60"></span>
                            <span>Serving</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-white/20"></span>
                            <span>Progress</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // Regular text-only features
            return (
              <div
                key={index}
                className={`flex ${
                  feature.align === "left" ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  ref={(el) => {
                    boxRef.current[index] = el;
                  }}
                  className={`w-full max-w-sm ${
                    feature.align === "left" ? "md:mr-auto" : "md:ml-auto"
                  }`}
                >
                  <p
                    ref={(el) => {
                      textRef.current[index] = el;
                    }}
                    className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight"
                    style={{ fontFamily: "var(--font-plus-jakarta)" }}
                  >
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sentinel */}
        <div ref={endRef} className="h-px" />
      </div>
    </section>
  );
}
