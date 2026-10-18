// components/ForgotPasswordModal.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { X, Mail, Lock, KeyRound, CheckCircle2, ArrowLeft } from "lucide-react";
import {
  requestPasswordResetPin,
  verifyResetPin,
  resetPasswordWithPin,
} from "@/actions/password-reset";

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

type Step = "email" | "pin" | "password" | "done";

const RESEND_SECONDS = 60;

const inputClass =
  "w-full rounded-lg border border-[#E2E8F0] bg-white py-3 text-sm outline-none transition-colors focus:border-[#0000CC] disabled:cursor-not-allowed disabled:opacity-50";
const primaryBtn =
  "flex w-full items-center justify-center gap-2 rounded-lg bg-[#0000CC] py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#000099] disabled:cursor-not-allowed disabled:opacity-70";
const secondaryBtn =
  "w-full rounded-lg border border-[#E2E8F0] py-3 text-sm font-semibold text-[#475569] transition-colors hover:bg-gray-50 disabled:opacity-50";

export default function ForgotPasswordModal({
  open,
  onClose,
  defaultEmail = "",
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(defaultEmail);
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [isPending, startTransition] = useTransition();

  // Reset everything each time the modal opens
  useEffect(() => {
    if (open) {
      setStep("email");
      setEmail(defaultEmail);
      setPin("");
      setPassword("");
      setConfirm("");
      setError("");
      setInfo("");
      setCooldown(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Resend countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!open) return null;

  // ── Step handlers ──

  function sendPin(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    setInfo("");
    startTransition(async () => {
      const res = await requestPasswordResetPin(email);
      if (!res.success) {
        setError(res.message);
        return;
      }
      setStep("pin");
      setPin("");
      setInfo(res.message);
      setCooldown(RESEND_SECONDS);
    });
  }

  function verifyPin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    startTransition(async () => {
      const res = await verifyResetPin(email, pin);
      if (!res.success) {
        setError(res.message);
        return;
      }
      setStep("password");
    });
  }

  function submitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const res = await resetPasswordWithPin(email, pin, password, confirm);
      if (!res.success) {
        setError(res.message);
        return;
      }
      setStep("done");
    });
  }

  const titleStyle = { fontFamily: "var(--font-plus-jakarta)" };
  const textStyle = { fontFamily: "var(--font-geist-sans)" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-password-title"
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-md p-1 text-[#94A3B8] transition-colors hover:text-[#64748B]"
        >
          <X className="h-5 w-5" />
        </button>

        {/* ───────── Step 1: email ───────── */}
        {step === "email" && (
          <>
            <h2
              id="forgot-password-title"
              className="mb-2 text-2xl font-bold text-[#0F172A]"
              style={titleStyle}
            >
              Forgot password?
            </h2>
            <p className="mb-6 text-sm text-[#64748B]" style={textStyle}>
              Enter your staff email and we&apos;ll send a 6-digit PIN to reset
              your password.
            </p>

            <form onSubmit={sendPin} className="space-y-5">
              <div>
                <label
                  htmlFor="forgot-email"
                  className="mb-1.5 block text-sm font-semibold text-[#0F172A]"
                  style={textStyle}
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="staff@bcc.edu.ph"
                    disabled={isPending}
                    className={`${inputClass} pl-10 pr-4`}
                    style={textStyle}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  className={secondaryBtn}
                  style={textStyle}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className={primaryBtn}
                  style={textStyle}
                >
                  {isPending ? "Sending..." : "Send PIN"}
                </button>
              </div>
            </form>
          </>
        )}

        {/* ───────── Step 2: PIN ───────── */}
        {step === "pin" && (
          <>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setError("");
                setInfo("");
              }}
              className="mb-4 inline-flex items-center gap-1 text-sm text-[#64748B] transition-colors hover:text-[#0000CC]"
              style={textStyle}
            >
              <ArrowLeft className="h-4 w-4" />
              Change email
            </button>

            <h2
              id="forgot-password-title"
              className="mb-2 text-2xl font-bold text-[#0F172A]"
              style={titleStyle}
            >
              Enter your PIN
            </h2>
            <p className="mb-6 text-sm text-[#64748B]" style={textStyle}>
              We sent a 6-digit PIN to{" "}
              <span className="font-semibold text-[#0F172A]">{email}</span>. It
              expires in 10 minutes.
            </p>

            <form onSubmit={verifyPin} className="space-y-5">
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  autoFocus
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  disabled={isPending}
                  className={`${inputClass} pl-10 pr-4 text-center text-xl font-semibold tracking-[0.5em]`}
                  style={textStyle}
                />
              </div>

              {info && !error && (
                <p
                  className="text-center text-xs text-[#64748B]"
                  style={textStyle}
                >
                  {info}
                </p>
              )}
              {error && (
                <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending || pin.length !== 6}
                className={primaryBtn}
                style={textStyle}
              >
                {isPending ? "Verifying..." : "Verify PIN"}
              </button>

              <p
                className="text-center text-sm text-[#64748B]"
                style={textStyle}
              >
                Didn&apos;t get it?{" "}
                <button
                  type="button"
                  onClick={() => sendPin()}
                  disabled={isPending || cooldown > 0}
                  className="font-semibold text-[#0000CC] hover:underline disabled:cursor-not-allowed disabled:text-[#94A3B8] disabled:no-underline"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend PIN"}
                </button>
              </p>
            </form>
          </>
        )}

        {/* ───────── Step 3: new password ───────── */}
        {step === "password" && (
          <>
            <h2
              id="forgot-password-title"
              className="mb-2 text-2xl font-bold text-[#0F172A]"
              style={titleStyle}
            >
              Set a new password
            </h2>
            <p className="mb-6 text-sm text-[#64748B]" style={textStyle}>
              Choose a password of at least 6 characters.
            </p>

            <form onSubmit={submitNewPassword} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="password"
                  required
                  minLength={6}
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  disabled={isPending}
                  className={`${inputClass} pl-10 pr-4`}
                  style={textStyle}
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={isPending}
                  className={`${inputClass} pl-10 pr-4`}
                  style={textStyle}
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className={primaryBtn}
                style={textStyle}
              >
                {isPending ? "Updating..." : "Update password"}
              </button>
            </form>
          </>
        )}

        {/* ───────── Step 4: done ───────── */}
        {step === "done" && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            </div>
            <h2
              id="forgot-password-title"
              className="mb-2 text-2xl font-bold text-[#0F172A]"
              style={titleStyle}
            >
              Password updated
            </h2>
            <p className="mb-6 text-sm text-[#64748B]" style={textStyle}>
              Your password has been changed. You can now sign in with your new
              password.
            </p>
            <button
              type="button"
              onClick={onClose}
              className={primaryBtn}
              style={textStyle}
            >
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
