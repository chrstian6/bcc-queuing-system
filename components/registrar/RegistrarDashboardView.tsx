// components/registrar/RegistrarDashboardView.tsx
// Server component: registrar's dashboard (document requests, no queue).
import Link from "next/link";
import {
  getRegistrarRequestStats,
  getRegistrarRequests,
} from "@/actions/documentRequest";
import {
  DOCUMENT_TYPE_LABELS,
  REQUEST_STATUS_LABELS,
  type DocumentType,
  type DocumentRequestStatus,
} from "@/types/documentRequest";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  processing: "bg-blue-50 text-blue-700",
  "ready-for-pickup": "bg-violet-50 text-violet-700",
  released: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-600",
};

export async function RegistrarDashboardView({
  staffName,
}: {
  staffName: string;
}) {
  const [statsResult, recentResult] = await Promise.all([
    getRegistrarRequestStats(),
    getRegistrarRequests(),
  ]);

  const stats = statsResult.success
    ? (statsResult as any).stats
    : {
        pending: 0,
        processing: 0,
        ready: 0,
        releasedToday: 0,
        rejectedToday: 0,
        total: 0,
      };
  const recent = (recentResult.requests || []).slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-['Plus_Jakarta_Sans']">
          Welcome, {staffName.split(" ")[0]}
        </h1>
        <p className="text-sm text-gray-500 mt-1 font-['Plus_Jakarta_Sans']">
          Registrar — Document Requests
        </p>
      </div>

      {/* Row 1: backlog hero + stat chips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 font-['Plus_Jakarta_Sans']">
        <div className="rounded-xl bg-gradient-to-br from-[#1B5A8C] to-[#0B3B5F] p-6 text-white">
          <span className="text-sm font-medium text-white/70">
            Pending Requests
          </span>
          <div className="text-6xl font-extrabold tracking-tight mt-2 mb-4">
            {stats.pending}
          </div>
          <Link
            href="/staff/registrar/requests?status=pending"
            className="inline-block px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold transition-colors"
          >
            Review requests
          </Link>
        </div>

        <div className="lg:col-span-2 rounded-xl bg-white border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Today&apos;s Overview
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-2xl font-bold text-gray-900">
                {stats.processing}
              </p>
              <p className="text-xs text-gray-500 mt-1">Processing</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-2xl font-bold text-gray-900">{stats.ready}</p>
              <p className="text-xs text-gray-500 mt-1">Ready for pickup</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-2xl font-bold text-gray-900">
                {stats.releasedToday}
              </p>
              <p className="text-xs text-gray-500 mt-1">Released today</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: recent requests */}
      <div className="rounded-xl bg-white border border-gray-200 p-6 font-['Plus_Jakarta_Sans']">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Recent Requests
          </h2>
          <Link
            href="/staff/registrar/requests"
            className="text-sm font-medium text-[#1B5A8C] hover:text-[#154874]"
          >
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">
            No document requests yet
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recent.map((request: any) => (
              <li
                key={request.requestId}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {request.requestId} —{" "}
                    {DOCUMENT_TYPE_LABELS[
                      request.documentType as DocumentType
                    ] || request.documentType}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {request.student?.lastName}, {request.student?.firstName} •{" "}
                    {new Date(request.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_BADGE[request.status] || "bg-gray-100 text-gray-600"}`}
                >
                  {REQUEST_STATUS_LABELS[
                    request.status as DocumentRequestStatus
                  ] || request.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
