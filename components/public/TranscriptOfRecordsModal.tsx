// components/public/TranscriptOfRecordsModal.tsx
"use client";

import { useEffect, useState } from "react";
import { X, FileText, Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import TranscriptOfRecordsForm, {
  TorFormData,
} from "./TranscriptOfRecordsForm";
import { createPublicTorRequest } from "@/actions/documentRequest";

interface TranscriptOfRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TranscriptOfRecordsModal({
  isOpen,
  onClose,
}: TranscriptOfRecordsModalProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successData, setSuccessData] = useState<{
    requestId: string;
    fee: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      if (scrollY) window.scrollTo(0, parseInt(scrollY || "0") * -1);
    }

    return () => {
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      if (scrollY) window.scrollTo(0, parseInt(scrollY || "0") * -1);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (data: TorFormData) => {
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const idempotencyKey = `tor_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

      const result = await createPublicTorRequest(data, idempotencyKey);

      if (result.success && result.request) {
        setSuccessData({
          requestId: result.request.requestId,
          fee: data.fee,
        });
      } else {
        setSubmitError(
          result.error || "Failed to submit TOR request. Please try again.",
        );
      }
    } catch (error) {
      console.error("Error submitting TOR request:", error);
      setSubmitError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    setSuccessData(null);
    setSubmitError("");
    onClose();
  };

  const handleDismissCancel = () => {
    setShowCancelConfirm(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleCancelClick}
        />

        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col"
          style={{ maxHeight: "90vh", height: "90vh" }}
        >
          <div className="flex-shrink-0 bg-white border-b border-gray-100 rounded-t-2xl px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#0000CC]/10 rounded-lg">
                  <FileText className="w-5 h-5 text-[#0000CC]" />
                </div>
                <div>
                  <h2
                    className="text-lg font-bold text-[#0F172A]"
                    style={{ fontFamily: "var(--font-geist-sans)" }}
                  >
                    Transcript of Records Request
                  </h2>
                  <p
                    className="text-sm text-gray-500"
                    style={{ fontFamily: "var(--font-geist-sans)" }}
                  >
                    Registrar&apos;s Office
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelClick}
                className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto overscroll-contain"
            style={{
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "thin",
              scrollbarColor: "#CBD5E1 #F1F5F9",
            }}
          >
            <div className="px-6 py-6">
              {successData ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-7 h-7 text-green-500" />
                  </div>
                  <h3
                    className="text-lg font-bold text-[#0F172A] mb-2"
                    style={{ fontFamily: "var(--font-geist-sans)" }}
                  >
                    Request Submitted!
                  </h3>
                  <p
                    className="text-sm text-gray-600 mb-4"
                    style={{ fontFamily: "var(--font-geist-sans)" }}
                  >
                    Your Transcript of Records request has been submitted
                    successfully.
                  </p>
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 mb-4 inline-block">
                    <p
                      className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1"
                      style={{ fontFamily: "var(--font-geist-sans)" }}
                    >
                      Request ID
                    </p>
                    <p
                      className="text-xl font-bold text-[#0000CC]"
                      style={{ fontFamily: "var(--font-geist-sans)" }}
                    >
                      {successData.requestId}
                    </p>
                  </div>
                  <p
                    className="text-sm text-gray-500 mb-6"
                    style={{ fontFamily: "var(--font-geist-sans)" }}
                  >
                    Please keep your Request ID for reference. Fee: ₱
                    {successData.fee}.00
                  </p>
                  <div>
                    <button
                      onClick={handleConfirmCancel}
                      className="px-6 py-2.5 bg-[#0000CC] text-white text-sm font-semibold rounded-xl hover:bg-[#0000AA] transition"
                      style={{ fontFamily: "var(--font-geist-sans)" }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {submitError && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p
                        className="text-sm text-red-600"
                        style={{ fontFamily: "var(--font-geist-sans)" }}
                      >
                        {submitError}
                      </p>
                    </div>
                  )}

                  <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
                    <Info className="w-5 h-5 text-[#0000CC] flex-shrink-0 mt-0.5" />
                    <div>
                      <h3
                        className="text-sm font-semibold text-[#0000CC] mb-1"
                        style={{ fontFamily: "var(--font-geist-sans)" }}
                      >
                        Request for Transcript of Records
                      </h3>
                      <p
                        className="text-sm text-gray-600"
                        style={{ fontFamily: "var(--font-geist-sans)" }}
                      >
                        Please fill out all required fields. Processing time is
                        typically 3-5 working days.
                      </p>
                    </div>
                  </div>

                  <TranscriptOfRecordsForm
                    onSubmit={handleSubmit}
                    onCancel={handleCancelClick}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        <style jsx>{`
          div::-webkit-scrollbar {
            width: 8px;
          }
          div::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 10px;
          }
          div::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
          }
          div::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}</style>
      </div>

      {showCancelConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleDismissCancel}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>

              <h3
                className="text-lg font-bold text-[#0F172A] mb-2"
                style={{ fontFamily: "var(--font-geist-sans)" }}
              >
                Cancel Request?
              </h3>

              <p
                className="text-sm text-gray-600 mb-6 leading-relaxed"
                style={{ fontFamily: "var(--font-geist-sans)" }}
              >
                Are you sure you want to cancel? Any entered data will be lost.
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={handleDismissCancel}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  Keep Editing
                </button>
                <button
                  onClick={handleConfirmCancel}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-500 text-sm font-semibold text-white transition hover:bg-red-600"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
