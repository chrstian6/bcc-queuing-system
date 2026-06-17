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
import { logoutAction } from "@/actions/auth";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Fragment } from "react";

interface AdminHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

const breadcrumbMap: Record<string, string> = {
  dashboard: "Dashboard",
  queue: "Queue Management",
  active: "Active Queue",
  serve: "Serve Ticket",
  tickets: "Ticket Requests",
  certificate: "Certificate of Enrollment",
  tor: "Transcript of Records",
  grades: "Request for Grades",
  assessment: "Request for Assessment",
  reports: "Reports",
  settings: "Settings",
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

  // Generate breadcrumbs from pathname
  const pathSegments = pathname.split("/").filter(Boolean).slice(1); // Remove 'admin'
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = "/admin/" + pathSegments.slice(0, index + 1).join("/");
    const label =
      breadcrumbMap[segment] ||
      segment.charAt(0).toUpperCase() + segment.slice(1);
    return { href, label, isLast: index === pathSegments.length - 1 };
  });

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href="/admin/dashboard"
              style={{ fontFamily: "var(--font-geist-sans)" }}
            >
              Admin
            </BreadcrumbLink>
          </BreadcrumbItem>
          {breadcrumbs.map((crumb) => (
            <Fragment key={crumb.href}>
              <BreadcrumbSeparator />
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

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Notification Button */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-gray-600" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback
                  className="bg-[#1B5A8C] text-white text-xs"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  {user?.name?.charAt(0) || "A"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p
                  className="text-sm font-medium text-gray-900"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  {user?.name || "Admin"}
                </p>
                <p
                  className="text-xs text-gray-500"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  {user?.email}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel style={{ fontFamily: "var(--font-geist-sans)" }}>
              My Account
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem style={{ fontFamily: "var(--font-geist-sans)" }}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem style={{ fontFamily: "var(--font-geist-sans)" }}>
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
    </header>
  );
}
