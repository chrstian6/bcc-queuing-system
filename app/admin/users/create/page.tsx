// app/admin/users/create/page.tsx
export const dynamic = "force-dynamic";

import { getSession } from "@/actions/auth";
import { redirect } from "next/navigation";
import { CreateUserForm } from "@/components/admin/CreateUserForm";

export default async function CreateUserPage() {
  const { success, session } = await getSession();
  if (!success || !session) redirect("/?error=unauthorized");
  if (session.user?.role !== "1") redirect("/?error=forbidden");

  return (
    <div
      className="px-6 py-6 space-y-6"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Create Staff Account
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create accounts for Registrar, Dean, DSDW, and Cashier staff
        </p>
      </div>

      <CreateUserForm />
    </div>
  );
}
