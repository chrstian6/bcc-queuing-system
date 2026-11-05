// components/staff/StaffUsersList.tsx
"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  Search,
  Users,
  Mail,
  Hash,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

interface StaffRecord {
  _id?: string;
  staffId: string;
  facultyId: string;
  firstName: string;
  lastName: string;
  email: string;
  roleName: string;
  cashierWindow?: string;
  status: string;
  mustChangePassword?: boolean;
  createdAt?: string;
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  suspended: "bg-red-100 text-red-700",
};

const ROLE_DISPLAY: Record<string, string> = {
  dean: "Dean",
  registrar: "Registrar",
  cashier: "Cashier",
  dsdw: "DSDW",
};

export function StaffUsersList({
  initialStaff,
  roleName,
  canCreate,
}: {
  initialStaff: StaffRecord[];
  roleName: string;
  canCreate: boolean;
}) {
  const [query, setQuery] = useState("");
  const [staff] = useState(initialStaff);

  const filtered = useMemo(() => {
    if (!query.trim()) return staff;
    const q = query.trim().toLowerCase();
    return staff.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.staffId.toLowerCase().includes(q) ||
        (s.facultyId || "").toLowerCase().includes(q),
    );
  }, [staff, query]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or ID"
            className="pl-10 h-10"
          />
        </div>
        {canCreate && (
          <Button asChild className="bg-[#1B5A8C] hover:bg-[#0B3B5F]">
            <Link href={`/staff/${roleName}/users/create`}>
              <UserPlus className="w-4 h-4 mr-2" /> Create Account
            </Link>
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">
            {query ? "No matching staff" : "No staff accounts yet"}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filtered.map((s) => (
              <div
                key={s.staffId}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#1B5A8C]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[#1B5A8C]">
                    {(s.firstName?.[0] || "") + (s.lastName?.[0] || "")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {s.firstName} {s.lastName}
                    </p>
                    <Badge
                      className={`${STATUS_BADGE[s.status] || "bg-gray-100 text-gray-600"} text-[10px]`}
                    >
                      {s.status}
                    </Badge>
                    {s.mustChangePassword && (
                      <Badge className="bg-amber-100 text-amber-700 text-[10px]">
                        <Clock className="w-3 h-3 mr-1" />
                        Temp password
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {ROLE_DISPLAY[s.roleName] || s.roleName}
                    </Badge>
                    {s.cashierWindow && (
                      <Badge variant="secondary" className="text-[10px]">
                        Window {s.cashierWindow}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {s.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      {s.facultyId}
                    </span>
                    <span className="font-mono text-[10px] text-gray-400">
                      {s.staffId}
                    </span>
                  </div>
                </div>
                {s.status === "active" && !s.mustChangePassword && (
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                )}
                {s.status === "suspended" && (
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
