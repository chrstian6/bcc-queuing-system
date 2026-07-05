// app/student/documents/page.tsx
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMyDocumentRequests } from "@/actions/documentRequest";
import { DocumentRequestForm } from "@/components/student/DocumentRequestForm";
import { DocumentRequestList } from "@/components/student/DocumentRequestList";

export default async function StudentDocumentsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "2") {
    redirect("/?error=forbidden");
  }

  const result = await getMyDocumentRequests();
  const requests = result.requests || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-['Plus_Jakarta_Sans']">
            Document Requests
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-['Plus_Jakarta_Sans']">
            Request TOR, COE, and other registrar documents — no queuing needed
          </p>
        </div>
        <DocumentRequestForm />
      </div>

      {!result.success && result.error && (
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700 font-['Plus_Jakarta_Sans']">
          {result.error}
        </div>
      )}

      <DocumentRequestList requests={requests} />
    </div>
  );
}
