// app/admin/users/staff/page.tsx
export const dynamic = "force-dynamic";

import { getSession } from "@/actions/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import {
  UserPlus,
  Users,
  Building2,
  Banknote,
  Shield,
  Mail,
  Calendar,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import connectDB from "@/lib/mongodb";
import Staff from "@/models/Staff";

export default async function StaffAccountsPage() {
  const { success, session } = await getSession();
  if (!success || !session) redirect("/?error=unauthorized");
  if (session.user?.role !== "1") redirect("/?error=forbidden");

  // Fetch staff from database
  let staffMembers: any[] = [];
  let totalStaff = 0;
  let registrarCount = 0;
  let cashierCount = 0;
  let activeCount = 0;

  try {
    await connectDB();

    const allStaff = await Staff.find({})
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    staffMembers = JSON.parse(JSON.stringify(allStaff));
    totalStaff = staffMembers.length;
    registrarCount = staffMembers.filter(
      (s: any) => s.roleName === "registrar",
    ).length;
    cashierCount = staffMembers.filter(
      (s: any) => s.roleName === "cashier",
    ).length;
    activeCount = staffMembers.filter((s: any) => s.status === "active").length;
  } catch (error) {
    console.error("Error fetching staff:", error);
  }

  return (
    <div
      className="p-6 space-y-6"
      style={{ fontFamily: "var(--font-geist-sans)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage registrar and cashier staff accounts
          </p>
        </div>
        <Button asChild className="bg-[#1B5A8C] hover:bg-[#0B3B5F]">
          <Link href="/admin/users/create">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Staff
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
              <p className="text-2xl font-bold">{totalStaff}</p>
              <p className="text-xs text-muted-foreground">Total Staff</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{registrarCount}</p>
              <p className="text-xs text-muted-foreground">Registrar Staff</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Banknote className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{cashierCount}</p>
              <p className="text-xs text-muted-foreground">Cashier Staff</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Active Staff</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>All Staff</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Mail className="w-4 h-4 mr-2" />
                Email All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {staffMembers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No staff accounts found</p>
              <p className="text-xs mt-1">
                Create your first staff account to get started
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Window</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffMembers.map((staff: any) => (
                    <TableRow key={staff._id}>
                      <TableCell className="font-mono text-xs">
                        {staff.staffId}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">
                            {staff.firstName} {staff.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {staff.facultyId}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">{staff.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {staff.roleName === "registrar" ? (
                          <Badge className="bg-blue-100 text-blue-700">
                            <Building2 className="w-3 h-3 mr-1" />
                            Registrar
                          </Badge>
                        ) : staff.roleName === "cashier" ? (
                          <Badge className="bg-green-100 text-green-700">
                            <Banknote className="w-3 h-3 mr-1" />
                            Cashier
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{staff.roleName}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {staff.cashierWindow ? (
                          <Badge variant="outline" className="font-mono">
                            Window {staff.cashierWindow}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            N/A
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {staff.status === "active" ? (
                          <Badge className="bg-green-100 text-green-700">
                            Active
                          </Badge>
                        ) : staff.status === "inactive" ? (
                          <Badge className="bg-gray-100 text-gray-700">
                            Inactive
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">
                            Suspended
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(staff.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/users/staff/${staff.staffId}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link
                              href={`/admin/users/staff/${staff.staffId}/edit`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {staffMembers.length > 0 && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>Showing {staffMembers.length} staff members</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Department Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Registrar Staff */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              Registrar Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            {staffMembers.filter((s: any) => s.roleName === "registrar")
              .length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No registrar staff</p>
              </div>
            ) : (
              <div className="space-y-3">
                {staffMembers
                  .filter((s: any) => s.roleName === "registrar")
                  .map((staff: any) => (
                    <div
                      key={staff._id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {staff.firstName} {staff.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {staff.email}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={
                          staff.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }
                      >
                        {staff.status}
                      </Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cashier Staff */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="w-4 h-4 text-green-500" />
              Cashier Staff
            </CardTitle>
          </CardHeader>
          <CardContent>
            {staffMembers.filter((s: any) => s.roleName === "cashier")
              .length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No cashier staff</p>
              </div>
            ) : (
              <div className="space-y-3">
                {staffMembers
                  .filter((s: any) => s.roleName === "cashier")
                  .map((staff: any) => (
                    <div
                      key={staff._id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Banknote className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {staff.firstName} {staff.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {staff.email}
                            {staff.cashierWindow &&
                              ` • Window ${staff.cashierWindow}`}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={
                          staff.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }
                      >
                        {staff.status}
                      </Badge>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
