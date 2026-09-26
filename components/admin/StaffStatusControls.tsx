// components/admin/StaffStatusControls.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Ban,
  AlertTriangle,
  Loader2,
  MoreVertical,
} from "lucide-react";
import { updateStaffStatus } from "@/actions/staff";

interface StaffStatusControlsProps {
  staffId: string;
  staffName: string;
  currentStatus: "active" | "inactive" | "suspended";
  isSelf?: boolean;
}

type StaffStatus = "active" | "inactive" | "suspended";

export function StaffStatusControls({
  staffId,
  staffName,
  currentStatus,
  isSelf = false,
}: StaffStatusControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<StaffStatus | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const requestStatusChange = (next: StaffStatus) => {
    if (next === currentStatus) return;
    if (isSelf) {
      setMessage({
        type: "error",
        text: "You cannot change your own status",
      });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    setPendingStatus(next);
    setConfirmOpen(true);
  };

  const applyChange = async () => {
    if (!pendingStatus) return;

    const result = await updateStaffStatus(staffId, pendingStatus);

    setConfirmOpen(false);

    if (result.success) {
      setMessage({
        type: "success",
        text: `Staff marked as ${pendingStatus}`,
      });
      setPendingStatus(null);
      startTransition(() => {
        router.refresh();
      });
      setTimeout(() => setMessage(null), 2500);
    } else {
      setMessage({
        type: "error",
        text: result.error || "Failed to update status",
      });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const getStatusLabel = (status: StaffStatus) => {
    switch (status) {
      case "active":
        return "Active";
      case "inactive":
        return "Inactive";
      case "suspended":
        return "Suspended";
    }
  };

  const confirmTitle = (() => {
    if (pendingStatus === "active") return "Activate this staff account?";
    if (pendingStatus === "inactive") return "Deactivate this staff account?";
    if (pendingStatus === "suspended") return "Suspend this staff account?";
    return "Change status?";
  })();

  const confirmDescription = (() => {
    if (pendingStatus === "active") {
      return `${staffName} will be able to log in and serve students again.`;
    }
    if (pendingStatus === "inactive") {
      return `${staffName} will not be able to log in or serve students until reactivated.`;
    }
    if (pendingStatus === "suspended") {
      return `${staffName} will be blocked from logging in. Consider suspending only for policy violations.`;
    }
    return "";
  })();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            className="h-8 w-8 p-0"
            aria-label="Change staff status"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MoreVertical className="w-4 h-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Change Status</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => requestStatusChange("active")}
            disabled={currentStatus === "active" || isSelf}
          >
            <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
            <span className={currentStatus === "active" ? "font-semibold" : ""}>
              {currentStatus === "active" ? "✓ Active" : "Activate"}
            </span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => requestStatusChange("inactive")}
            disabled={currentStatus === "inactive" || isSelf}
          >
            <Ban className="w-4 h-4 mr-2 text-gray-500" />
            <span
              className={currentStatus === "inactive" ? "font-semibold" : ""}
            >
              {currentStatus === "inactive" ? "✓ Inactive" : "Deactivate"}
            </span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => requestStatusChange("suspended")}
            disabled={currentStatus === "suspended" || isSelf}
          >
            <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
            <span
              className={currentStatus === "suspended" ? "font-semibold" : ""}
            >
              {currentStatus === "suspended" ? "✓ Suspended" : "Suspend"}
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Inline flash message */}
      {message && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg ${
            message.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
            <DialogDescription>{confirmDescription}</DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setConfirmOpen(false);
                setPendingStatus(null);
              }}
              className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyChange}
              disabled={isPending}
              className={`px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-60 inline-flex items-center gap-2 ${
                pendingStatus === "active"
                  ? "bg-green-600 hover:bg-green-700"
                  : pendingStatus === "inactive"
                    ? "bg-gray-600 hover:bg-gray-700"
                    : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {pendingStatus === "active"
                ? "Activate"
                : pendingStatus === "inactive"
                  ? "Deactivate"
                  : "Suspend"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
