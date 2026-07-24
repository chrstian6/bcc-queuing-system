// components/student/DocumentRequestList.tsx
"use client";

import { useState } from "react";
import {
  DOCUMENT_TYPE_LABELS,
  REQUEST_STATUS_LABELS,
  type DocumentType,
  type DocumentRequestStatus,
} from "@/types/documentRequest";
import { ChevronDown } from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  processing: "bg-blue-50 text-blue-700",
  "ready-for-pickup": "bg-violet-50 text-violet-700",
  released: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-600",
};

export function DocumentRequestList({ requests }: { requests: any[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!requests.length) {
    return (
      <div className="rounded-xl bg-white border border-gray-200 p-10 text-center font-['Plus_Jakarta_Sans']">
        <p className="text-sm text-gray-400">
          No document requests yet. Use “New Request” to submit one.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100 font-['Plus_Jakarta_Sans']">
      {requests.map((request) => {
        const typeLabel =
          request.documentType === "other" && request.otherDescription
            ? request.otherDescription
            : DOCUMENT_TYPE_LABELS[request.documentType as DocumentType] ||
              request.documentType;
        const isOpen = expanded === request.requestId;

        return (
          <div key={request.requestId}>
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : request.requestId)}
              className="w-full px-4 py-3 flex items-center justify-between gap-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {request.requestId} — {typeLabel}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {request.copies} {request.copies === 1 ? "copy" : "copies"} •
                  Submitted {new Date(request.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[request.status] || "bg-gray-100 text-gray-600"}`}
                >
                  {REQUEST_STATUS_LABELS[
                    request.status as DocumentRequestStatus
                  ] || request.status}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </div>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-1">
                <div className="rounded-lg bg-gray-50 p-4 space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Purpose
                    </h4>
                    <p className="text-sm text-gray-700">{request.purpose}</p>
                  </div>
                  {request.status === "rejected" && request.remarks && (
                    <div>
                      <h4 className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-1">
                        Reason
                      </h4>
                      <p className="text-sm text-red-600">{request.remarks}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Timeline
                    </h4>
                    <ol className="space-y-2">
                      {(request.statusHistory || []).map(
                        (entry: any, index: number) => (
                          <li
                            key={index}
                            className="flex items-center gap-3 text-sm"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1B5A8C] flex-shrink-0" />
                            <span className="font-medium text-gray-700">
                              {REQUEST_STATUS_LABELS[
                                entry.status as DocumentRequestStatus
                              ] || entry.status}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </li>
                        ),
                      )}
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
