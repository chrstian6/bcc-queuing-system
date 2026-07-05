// components/admin/AdminHeader.tsx
"use client";

import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, LogOut, Settings, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { logoutAction } from "@/actions/auth";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Fragment, useMemo } from "react";

interface AdminHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
    staffRole?: string;
    staffId?: string;
    facultyId?: string;
  };
}

const breadcrumbMap: Record<string, string> = {
  admin: "Admin",
  staff: "Staff",
  student: "Student",
  requests: "Document Requests",
  history: "History",
  dashboard: "Dashboard",
  queue: "Queue Management",
  active: "Active Queue",
  serve: "Serve Ticket",
  all: "All Tickets",
  tickets: "Ticket Requests",
  certificate: "Certificate of Enrollment",
  tor: "Transcript of Records",
  grades: "Request for Grades",
  assessment: "Request for Assessment",
  reports: "Reports",
  settings: "Settings",
  users: "User Management",
  monitor: "System Monitor",
  logs: "System Logs",
  analytics: "Queue Analytics",
  performance: "Performance",
  records: "Student Records",
  documents: "Documents",
  students: "Student Management",
  academics: "Academic Affairs",
  services: "Student Services",
  programs: "Programs",
  payments: "Payments",
  transactions: "Transactions",
  registrar: "Registrar",
  dean: "Dean",
  dsdw: "DSDW",
  cashier: "Cashier",
};

const roleNames: Record<string, string> = {
  registrar: "Registrar",
  dean: "Dean",
  dsdw: "DSDW",
  cashier: "Cashier",
};

export function AdminHeader({ user }: AdminHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { update } = useSession();

  const handleLogout = async () => {
    const result = await logoutAction();
    if (result.success) {
      await update();
      router.push("/");
      router.refresh();
    }
  };

  const isAdmin = user?.role === "1";
  const staffRole = user?.staffRole || "";
  const roleDisplayName = isAdmin ? "Admin" : roleNames[staffRole] || "Staff";

  const breadcrumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    return segments.map((segment, index) => {
      const href = "/" + segments.slice(0, index + 1).join("/");
      const label =
        breadcrumbMap[segment] ||
        segment.charAt(0).toUpperCase() + segment.slice(1);
      return { href, label, isLast: index === segments.length - 1 };
    });
  }, [pathname]);

  return (
    <header className="flex h-16 shrink-0 p-4 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b">
      <div className="flex items-center gap-2 px-4 w-full justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <Fragment key={crumb.href}>
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {crumb.isLast ? (
                      <BreadcrumbPage
                        style={{ fontFamily: "var(--font-geist-sans)" }}
                      >
                        {crumb.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        href={crumb.href}
                        style={{ fontFamily: "var(--font-geist-sans)" }}
                      >
                        {crumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback
                    className="bg-[#1B5A8C] text-white text-xs"
                    style={{ fontFamily: "var(--font-geist-sans)" }}
                  >
                    {user?.name?.charAt(0) || (isAdmin ? "A" : "S")}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <p
                    className="text-sm font-medium text-gray-900"
                    style={{ fontFamily: "var(--font-geist-sans)" }}
                  >
                    {user?.name || roleDisplayName}
                  </p>
                  <p
                    className="text-xs text-gray-500"
                    style={{ fontFamily: "var(--font-geist-sans)" }}
                  >
                    {isAdmin ? user?.email : roleDisplayName}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel
                style={{ fontFamily: "var(--font-geist-sans)" }}
              >
                My Account
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                style={{ fontFamily: "var(--font-geist-sans)" }}
              >
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                style={{ fontFamily: "var(--font-geist-sans)" }}
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600"
                style={{ fontFamily: "var(--font-geist-sans)" }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
