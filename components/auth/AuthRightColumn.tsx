// components/auth/AuthRightColumn.tsx
// Animated brand panel shared by the login and register pages.
"use client";

import { useEffect, useRef, useCallback } from "react";

const PHRASE = "Smart Queue. Better Experience.";
const MIN_FS = 120;
const MAX_FS = 400;

function measureTextWidth(text: string, font: string): number {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;
  return ctx.measureText(text).width;
}

function findBestFontSize(availableWidth: number): number {
  let lo = MIN_FS;
  let hi = MAX_FS;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const font = `900 ${mid}px 'Geist', system-ui, sans-serif`;
    const w = measureTextWidth(PHRASE, font);
    if (w <= availableWidth) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return Math.floor(lo);
}

const REPULSION_RADIUS = 160;
const MAX_DISPLACEMENT = 40;
const DOT_VISUAL_RADIUS = 28;

interface CharMetrics {
  char: string;
  width: number;
  x: number;
  y: number;
  row: number;
  opacity: number;
}

function buildCharacterGrid(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  fontSize: number,
): CharMetrics[] {
  const lineH = Math.round(fontSize * 0.85);
  const font = `900 ${fontSize}px 'Geist', system-ui, sans-serif`;
  ctx.font = font;

  const allChars: CharMetrics[] = [];
  const phraseText = PHRASE + "   ";
  const phraseW = ctx.measureText(phraseText).width;
  const repsPerLine = Math.ceil(cw / phraseW) + 2;

  const linesNeeded = Math.ceil(ch / lineH) + 2;

  const baseOpacities = [0.12, 0.14, 0.11, 0.15, 0.13, 0.1, 0.14, 0.12];

  for (let row = 0; row < linesNeeded; row++) {
    const baseY = row * lineH + lineH;
    const indent = row % 2 === 0 ? 0 : -phraseW * 0.5;

    for (let rep = 0; rep < repsPerLine; rep++) {
      let x = indent + rep * phraseW;

      for (let i = 0; i < phraseText.length; i++) {
        const char = phraseText[i];
        const charWidth = ctx.measureText(char).width;

        if (x + charWidth > 0 && x < cw && baseY > 0 && baseY < ch + lineH) {
          const opacityIndex = (row + rep + i) % baseOpacities.length;

          allChars.push({
            char,
            width: charWidth,
            x,
            y: baseY,
            row,
            opacity: baseOpacities[opacityIndex],
          });
        }

        x += charWidth;
      }
    }
  }

  return allChars;
}

function paintTextWithRepulsion(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  fontSize: number,
  dotX: number,
  dotY: number,
  charGrid: CharMetrics[],
) {
  const font = `900 ${fontSize}px 'Geist', system-ui, sans-serif`;
  const repulsionRadius = REPULSION_RADIUS;
  const maxDisplacement = MAX_DISPLACEMENT;

  ctx.clearRect(0, 0, cw, ch);

  for (const charMetrics of charGrid) {
    const { char, x, y, opacity } = charMetrics;

    const charCenterX = x + charMetrics.width / 2;
    const charCenterY = y - fontSize * 0.35;
    const dx = charCenterX - dotX;
    const dy = charCenterY - dotY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let renderX = x;
    let renderY = y;

    if (dist < repulsionRadius && dist > 0) {
      const strength =
        Math.pow(1 - dist / repulsionRadius, 2) * maxDisplacement;
      const angle = Math.atan2(dy, dx);
      renderX += Math.cos(angle) * strength;
      renderY += Math.sin(angle) * strength;
    }

    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.font = font;
    ctx.fillText(char, renderX, renderY);
  }

  const gradient = ctx.createRadialGradient(
    dotX,
    dotY,
    0,
    dotX,
    dotY,
    DOT_VISUAL_RADIUS * 1.5,
  );
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.2)");
  gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.1)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(dotX, dotY, DOT_VISUAL_RADIUS * 1.5, 0, Math.PI * 2);
  ctx.fill();
}

interface DotState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
}

function newTarget(w: number, h: number, margin = 80) {
  return {
    tx: margin + Math.random() * (w - margin * 2),
    ty: margin + Math.random() * (h - margin * 2),
  };
}

export const AuthRightColumn = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const charGridRef = useRef<CharMetrics[]>([]);
  const stateRef = useRef<DotState>({
    x: 200,
    y: 200,
    vx: 0,
    vy: 0,
    tx: 200,
    ty: 200,
  });
  const fontSizeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const resize = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const dpr = window.devicePixelRatio ?? 1;
    const cw = container.offsetWidth;
    const ch = container.offsetHeight;

    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = cw + "px";
    canvas.style.height = ch + "px";

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const fs = findBestFontSize(cw - 24);
    fontSizeRef.current = fs;

    charGridRef.current = buildCharacterGrid(ctx, cw, ch, fs);

    const s = stateRef.current;
    if (s.x > cw || s.y > ch) {
      s.x = cw / 2;
      s.y = ch / 2;
    }
    const t = newTarget(cw, ch);
    s.tx = t.tx;
    s.ty = t.ty;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    (document.fonts?.ready ?? Promise.resolve()).then(() => {
      resize();

      let lastTime = 0;
      let targetTimer = 0;

      const loop = (ts: number) => {
        const dt = Math.min(ts - lastTime, 50);
        lastTime = ts;
        targetTimer += dt;

        const canvas = canvasRef.current;
        const dot = dotRef.current;
        if (!canvas || !dot) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }

        const cw = canvas.offsetWidth;
        const ch = canvas.offsetHeight;

        const s = stateRef.current;
        const spring = 0.015;
        const damp = 0.88;
        s.vx += (s.tx - s.x) * spring;
        s.vy += (s.ty - s.y) * spring;
        s.vx *= damp;
        s.vy *= damp;
        s.x += s.vx;
        s.y += s.vy;

        const dist = Math.hypot(s.tx - s.x, s.ty - s.y);
        if (dist < 12 || targetTimer > 3000) {
          const t = newTarget(cw, ch);
          s.tx = t.tx;
          s.ty = t.ty;
          targetTimer = 0;
        }

        const ctx = canvas.getContext("2d");
        if (ctx && fontSizeRef.current > 0 && charGridRef.current.length > 0) {
          paintTextWithRepulsion(
            ctx,
            cw,
            ch,
            fontSizeRef.current,
            s.x,
            s.y,
            charGridRef.current,
          );
        }

        const RADIUS = 14;
        dot.style.transform = `translate(${s.x - RADIUS}px, ${s.y - RADIUS}px)`;

        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
    });

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [resize]);

  return (
    <div
      ref={containerRef}
      className="hidden lg:block lg:w-1/2 relative overflow-hidden h-screen bg-[#0000CC]"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ display: "block" }}
      />

      <div
        ref={dotRef}
        className="absolute pointer-events-none"
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "#ffffff",
          boxShadow:
            "0 0 0 8px rgba(255,255,255,0.2), 0 0 0 16px rgba(255,255,255,0.1), 0 0 0 24px rgba(255,255,255,0.05), 0 0 40px 12px rgba(255,255,255,0.2)",
          zIndex: 20,
          top: 0,
          left: 0,
          willChange: "transform",
        }}
      />
    </div>
  );
};
