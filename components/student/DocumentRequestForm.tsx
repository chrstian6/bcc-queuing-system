// components/student/DocumentRequestForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDocumentRequest } from "@/actions/documentRequest";
import {
  VALID_DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  type DocumentType,
} from "@/types/documentRequest";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2, Plus } from "lucide-react";

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-[#1B5A8C] outline-none transition-colors text-sm bg-white";

export function DocumentRequestForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType>("tor");
  const [otherDescription, setOtherDescription] = useState("");
  const [purpose, setPurpose] = useState("");
  const [copies, setCopies] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successId, setSuccessId] = useState<string | null>(null);

  const reset = () => {
    setDocumentType("tor");
    setOtherDescription("");
    setPurpose("");
    setCopies(1);
    setError("");
    setSuccessId(null);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (documentType === "other" && !otherDescription.trim()) {
      setError("Please describe the document you need");
      return;
    }
    if (purpose.trim().length < 5) {
      setError("Purpose must be at least 5 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createDocumentRequest({
        documentType,
        otherDescription,
        purpose,
        copies,
        idempotencyKey: crypto.randomUUID(),
      });
      setIsSubmitting(false);

      if (result.success && result.request) {
        setSuccessId(result.request.requestId);
        router.refresh();
      } else {
        setError(result.error || "Failed to submit request");
      }
    } catch (err) {
      console.error("Document request error:", err);
      setIsSubmitting(false);
      setError("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1B5A8C] text-white text-sm font-semibold hover:bg-[#154874] transition-colors font-['Plus_Jakarta_Sans']"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md font-['Plus_Jakarta_Sans']">
        {successId ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Request Submitted
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Keep this request number for reference
            </p>
            <p className="text-2xl font-extrabold tracking-wide text-[#1B5A8C] mb-6">
              {successId}
            </p>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="px-5 py-2.5 rounded-lg bg-[#1B5A8C] text-white text-sm font-semibold hover:bg-[#154874] transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Request a Document</DialogTitle>
              <DialogDescription>
                Submit a request to the Registrar&apos;s Office — no queuing
                needed. You&apos;ll get email updates as it&apos;s processed.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Document Type
                </label>
                <select
                  value={documentType}
                  onChange={(e) =>
                    setDocumentType(e.target.value as DocumentType)
                  }
                  className={inputClass}
                  disabled={isSubmitting}
                >
                  {VALID_DOCUMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {DOCUMENT_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              {documentType === "other" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Which document?
                  </label>
                  <input
                    type="text"
                    value={otherDescription}
                    onChange={(e) => setOtherDescription(e.target.value)}
                    placeholder="e.g. Good Moral Certificate"
                    maxLength={200}
                    className={inputClass}
                    disabled={isSubmitting}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Purpose
                </label>
                <Textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. For scholarship application"
                  maxLength={300}
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Number of Copies
                </label>
                <select
                  value={copies}
                  onChange={(e) => setCopies(Number(e.target.value))}
                  className={`${inputClass} max-w-[120px]`}
                  disabled={isSubmitting}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg bg-[#1B5A8C] text-white text-sm font-semibold hover:bg-[#154874] transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
