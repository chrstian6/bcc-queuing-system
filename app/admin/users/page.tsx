// app/admin/users/page.tsx
export const dynamic = "force-dynamic";

import { getSession } from "@/actions/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { UserPlus, Users, Shield, GraduationCap } from "lucide-react";

export default async function UsersPage() {
  const { success, session } = await getSession();
  if (!success || !session) redirect("/?error=unauthorized");
  if (session.user?.role !== "1") redirect("/?error=forbidden");

  return (
    <div
      className="p-6 space-y-6"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all user accounts
          </p>
        </div>
        <Button asChild className="bg-[#1B5A8C] hover:bg-[#0B3B5F]">
          <Link href="/admin/users/create">
            <UserPlus className="w-4 h-4 mr-2" />
            Create Account
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Staff</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">Students</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-muted-foreground">New Today</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No users found</p>
            <p className="text-xs mt-1">
              Create your first account to get started
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
