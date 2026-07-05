// app/staff/[role]/settings/page.tsx
export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CounterSettingsForm } from "@/components/staff/CounterSettingsForm";

export default async function StaffSettingsPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/?error=unauthorized");

  const { role } = await params;
  // Counter settings are cashier-only
  if (role !== "cashier" || session.user.staffRole !== "cashier") {
    redirect(`/staff/${session.user.staffRole || "cashier"}/dashboard`);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 font-['Plus_Jakarta_Sans']">
          Counter Settings
        </h1>
        <p className="text-sm text-gray-500 mt-1 font-['Plus_Jakarta_Sans']">
          Control your counter&apos;s availability, daily hours, breaks, and
          ticket limit
        </p>
      </div>
      <CounterSettingsForm staffId={session.user.staffId || ""} />
    </div>
  );
}
