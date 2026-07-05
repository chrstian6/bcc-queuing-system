// app/staff/[role]/requests/page.tsx
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DocumentRequestsView } from "@/components/registrar/DocumentRequestsView";

export default async function RegistrarRequestsPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/?error=unauthorized");

  const { role } = await params;
  // Document requests are registrar-only
  if (role !== "registrar" || session.user.role !== "3") {
    redirect(`/staff/${session.user.staffRole || "cashier"}/dashboard`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-['Plus_Jakarta_Sans']">
          Document Requests
        </h1>
        <p className="text-sm text-gray-500 mt-1 font-['Plus_Jakarta_Sans']">
          Review, process, and release student document requests
        </p>
      </div>
      <Suspense fallback={null}>
        <DocumentRequestsView />
      </Suspense>
    </div>
  );
}
