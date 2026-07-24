// components/admin/HistoryView.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getTicketHistory,
  getDocumentRequestHistory,
} from "@/actions/analytics";
import { getAllStaff } from "@/actions/staff";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  VALID_TRANSACTION_TYPES,
  VALID_STATUSES,
} from "@/types/ticket";
import {
  VALID_DOCUMENT_TYPES,
  VALID_REQUEST_STATUSES,
  DOCUMENT_TYPE_LABELS,
  REQUEST_STATUS_LABELS,
  type DocumentType,
  type DocumentRequestStatus,
} from "@/types/documentRequest";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

const PAGE_SIZE = 25;

const TICKET_STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  serving: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
};

const DOC_STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  processing: "bg-blue-50 text-blue-700",
  "ready-for-pickup": "bg-violet-50 text-violet-700",
  released: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-600",
};

function formatTransaction(type: string) {
  return type?.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

const selectClass =
  "px-3 py-2 rounded-lg border border-gray-200 focus:border-[#1B5A8C] outline-none text-sm bg-white";

function Pagination({
  page,
  total,
  onPage,
}: {
  page: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
      <span>
        {total} record{total === 1 ? "" : "s"} • Page {page} of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function TicketsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [staff, setStaff] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    status: "",
    transactionType: "",
    staffId: "",
  });

  useEffect(() => {
    getAllStaff().then((r) => {
      if (r.success) setStaff((r.staff || []).filter((s: any) => s.roleName === "cashier"));
    });
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const result = await getTicketHistory({
      ...filters,
      page,
      limit: PAGE_SIZE,
    });
    if (result.success) {
      setRows(result.tickets || []);
      setTotal(result.total || 0);
    }
    setIsLoading(false);
  }, [filters, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const setFilter = (key: keyof typeof filters) => (value: string) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilter("dateFrom")(e.target.value)}
          className={selectClass}
          aria-label="From date"
        />
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => setFilter("dateTo")(e.target.value)}
          className={selectClass}
          aria-label="To date"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilter("status")(e.target.value)}
          className={selectClass}
        >
          <option value="">All statuses</option>
          {VALID_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={filters.transactionType}
          onChange={(e) => setFilter("transactionType")(e.target.value)}
          className={selectClass}
        >
          <option value="">All types</option>
          {VALID_TRANSACTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {formatTransaction(t)}
            </option>
          ))}
        </select>
        <select
          value={filters.staffId}
          onChange={(e) => setFilter("staffId")(e.target.value)}
          className={selectClass}
        >
          <option value="">All cashiers</option>
          {staff.map((s) => (
            <option key={s.staffId} value={s.staffId}>
              {s.firstName} {s.lastName}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm p-8">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Wait</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                    No tickets found
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((ticket) => (
                  <TableRow key={ticket.ticketId}>
                    <TableCell className="font-semibold">
                      #{ticket.ticketNumber}
                    </TableCell>
                    <TableCell>
                      {formatTransaction(ticket.transactionType)}
                    </TableCell>
                    <TableCell>
                      {ticket.student?.firstName} {ticket.student?.lastName}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${TICKET_STATUS_BADGE[ticket.status] || "bg-gray-100 text-gray-600"}`}
                      >
                        {ticket.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {ticket.waitTime
                        ? `${Math.round(ticket.waitTime / 60)}m`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {new Date(ticket.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
      <Pagination page={page} total={total} onPage={setPage} />
    </div>
  );
}

function DocumentsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    status: "",
    documentType: "",
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const result = await getDocumentRequestHistory({
      ...filters,
      page,
      limit: PAGE_SIZE,
    });
    if (result.success) {
      setRows(result.requests || []);
      setTotal(result.total || 0);
    }
    setIsLoading(false);
  }, [filters, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const setFilter = (key: keyof typeof filters) => (value: string) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(e) => setFilter("dateFrom")(e.target.value)}
          className={selectClass}
          aria-label="From date"
        />
        <input
          type="date"
          value={filters.dateTo}
          onChange={(e) => setFilter("dateTo")(e.target.value)}
          className={selectClass}
          aria-label="To date"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilter("status")(e.target.value)}
          className={selectClass}
        >
          <option value="">All statuses</option>
          {VALID_REQUEST_STATUSES.map((s) => (
            <option key={s} value={s}>
              {REQUEST_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={filters.documentType}
          onChange={(e) => setFilter("documentType")(e.target.value)}
          className={selectClass}
        >
          <option value="">All types</option>
          {VALID_DOCUMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {DOCUMENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm p-8">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                    No requests found
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((request) => (
                  <TableRow key={request.requestId}>
                    <TableCell className="font-semibold">
                      {request.requestId}
                    </TableCell>
                    <TableCell>
                      {DOCUMENT_TYPE_LABELS[
                        request.documentType as DocumentType
                      ] || request.documentType}
                    </TableCell>
                    <TableCell>
                      {request.student?.firstName} {request.student?.lastName}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${DOC_STATUS_BADGE[request.status] || "bg-gray-100 text-gray-600"}`}
                      >
                        {REQUEST_STATUS_LABELS[
                          request.status as DocumentRequestStatus
                        ] || request.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {new Date(request.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
      <Pagination page={page} total={total} onPage={setPage} />
    </div>
  );
}

export function HistoryView() {
  return (
    <Tabs defaultValue="tickets" className="font-['Plus_Jakarta_Sans']">
      <TabsList>
        <TabsTrigger value="tickets">Tickets</TabsTrigger>
        <TabsTrigger value="documents">Document Requests</TabsTrigger>
      </TabsList>
      <TabsContent value="tickets" className="mt-4">
        <TicketsTab />
      </TabsContent>
      <TabsContent value="documents" className="mt-4">
        <DocumentsTab />
      </TabsContent>
    </Tabs>
  );
}
