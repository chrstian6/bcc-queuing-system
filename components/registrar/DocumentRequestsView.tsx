// components/registrar/DocumentRequestsView.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getRegistrarRequests,
  processDocumentRequest,
} from "@/actions/documentRequest";
import {
  DOCUMENT_TYPE_LABELS,
  REQUEST_STATUS_LABELS,
  type DocumentType,
  type DocumentRequestStatus,
} from "@/types/documentRequest";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronDown,
  Loader2,
  Play,
  PackageCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
} from "lucide-react";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "processing", label: "Processing" },
  { id: "ready-for-pickup", label: "Ready" },
  { id: "released", label: "Released" },
  { id: "rejected", label: "Rejected" },
];

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  processing: "bg-blue-50 text-blue-700",
  "ready-for-pickup": "bg-violet-50 text-violet-700",
  released: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-600",
};

function dayLabel(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function DocumentRequestsView() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";

  const [requests, setRequests] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      const result = await getRegistrarRequests({
        status: statusFilter,
        search,
      });
      if (result.success) setRequests(result.requests || []);
      setIsLoading(false);
    },
    [statusFilter, search],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync filter when sidebar sub-links change the ?status= param
  useEffect(() => {
    setStatusFilter(searchParams.get("status") || "all");
  }, [searchParams]);

  const runAction = async (
    requestId: string,
    action: "start-processing" | "mark-ready" | "release" | "reject",
    remarks?: string,
  ) => {
    setActingOn(requestId);
    const result = await processDocumentRequest(requestId, action, remarks);
    setActingOn(null);
    if (result.success) {
      const labels: Record<string, string> = {
        "start-processing": "Request moved to processing",
        "mark-ready": "Marked as ready for pickup",
        release: "Document released",
        reject: "Request rejected",
      };
      showMessage("success", labels[action]);
      setRejectTarget(null);
      setRejectRemarks("");
      loadData(true);
    } else {
      showMessage("error", result.error || "Action failed");
    }
  };

  // Group by day
  const groups: { label: string; items: any[] }[] = [];
  for (const request of requests) {
    const label = dayLabel(request.createdAt);
    const group = groups.find((g) => g.label === label);
    if (group) group.items.push(request);
    else groups.push({ label, items: [request] });
  }

  const actionButton =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="space-y-4 font-['Plus_Jakarta_Sans']">
      {message && (
        <div
          className={`p-3 rounded-lg text-sm border ${
            message.type === "success"
              ? "bg-green-50 border-green-100 text-green-700"
              : "bg-red-50 border-red-100 text-red-600"
          }`}
          role="status"
        >
          {message.text}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatusFilter(filter.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                statusFilter === filter.id
                  ? "bg-white text-[#1B5A8C] shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search request #, name, or school ID"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:border-[#1B5A8C] outline-none text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => loadData()}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Request list */}
      {isLoading ? (
        <p className="text-sm text-gray-400 py-10 text-center">
          Loading requests...
        </p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-gray-400 py-10 text-center">
          No document requests found
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.label}>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {group.label}
            </h3>
            <div className="rounded-xl bg-white border border-gray-200 divide-y divide-gray-100">
              {group.items.map((request) => {
                const isOpen = expanded === request.requestId;
                const isActing = actingOn === request.requestId;
                const typeLabel =
                  request.documentType === "other" && request.otherDescription
                    ? request.otherDescription
                    : DOCUMENT_TYPE_LABELS[
                        request.documentType as DocumentType
                      ] || request.documentType;

                return (
                  <div key={request.requestId}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded(isOpen ? null : request.requestId)
                      }
                      className="w-full px-4 py-3 flex items-center justify-between gap-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {request.requestId} — {typeLabel}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {request.student?.lastName},{" "}
                          {request.student?.firstName} (
                          {request.student?.schoolId}) • {request.copies}{" "}
                          {request.copies === 1 ? "copy" : "copies"}
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
                      <div className="px-4 pb-4 pt-1 space-y-4">
                        <div className="rounded-lg bg-gray-50 p-4 grid gap-3 sm:grid-cols-2 text-sm">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                              Student
                            </p>
                            <p className="text-gray-800">
                              {request.student?.firstName}{" "}
                              {request.student?.lastName} •{" "}
                              {request.student?.year}
                            </p>
                            <p className="text-xs text-gray-400">
                              {request.student?.email}
                              {request.student?.contactNumber
                                ? ` • ${request.student.contactNumber}`
                                : ""}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                              Purpose
                            </p>
                            <p className="text-gray-800">{request.purpose}</p>
                          </div>
                          {request.status === "rejected" &&
                            request.remarks && (
                              <div className="sm:col-span-2">
                                <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-1">
                                  Rejection Reason
                                </p>
                                <p className="text-red-600">
                                  {request.remarks}
                                </p>
                              </div>
                            )}
                        </div>

                        {/* Actions per status */}
                        <div className="flex flex-wrap gap-2">
                          {request.status === "pending" && (
                            <button
                              type="button"
                              disabled={isActing}
                              onClick={() =>
                                runAction(request.requestId, "start-processing")
                              }
                              className={`${actionButton} bg-[#1B5A8C] text-white hover:bg-[#154874]`}
                            >
                              {isActing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Play className="w-3.5 h-3.5" />
                              )}
                              Start Processing
                            </button>
                          )}
                          {request.status === "processing" && (
                            <button
                              type="button"
                              disabled={isActing}
                              onClick={() =>
                                runAction(request.requestId, "mark-ready")
                              }
                              className={`${actionButton} bg-violet-600 text-white hover:bg-violet-700`}
                            >
                              {isActing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <PackageCheck className="w-3.5 h-3.5" />
                              )}
                              Mark Ready for Pickup
                            </button>
                          )}
                          {request.status === "ready-for-pickup" && (
                            <button
                              type="button"
                              disabled={isActing}
                              onClick={() =>
                                runAction(request.requestId, "release")
                              }
                              className={`${actionButton} bg-green-600 text-white hover:bg-green-700`}
                            >
                              {isActing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              Release Document
                            </button>
                          )}
                          {["pending", "processing"].includes(
                            request.status,
                          ) && (
                            <button
                              type="button"
                              disabled={isActing}
                              onClick={() => {
                                setRejectTarget(request.requestId);
                                setRejectRemarks("");
                              }}
                              className={`${actionButton} bg-white border border-red-200 text-red-600 hover:bg-red-50`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Reject dialog */}
      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(next) => {
          if (!next) {
            setRejectTarget(null);
            setRejectRemarks("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md font-['Plus_Jakarta_Sans']">
          <DialogHeader>
            <DialogTitle>Reject Request {rejectTarget}</DialogTitle>
            <DialogDescription>
              The student will be emailed this reason. A reason is required.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectRemarks}
            onChange={(e) => setRejectRemarks(e.target.value)}
            placeholder="e.g. Outstanding balance must be settled first"
            maxLength={500}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setRejectTarget(null);
                setRejectRemarks("");
              }}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!rejectRemarks.trim() || actingOn !== null}
              onClick={() =>
                rejectTarget &&
                runAction(rejectTarget, "reject", rejectRemarks)
              }
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {actingOn !== null && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Reject Request
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
