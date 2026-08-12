// components/admin/AdminSidebar.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  ListOrdered,
  Receipt,
  ChartColumn,
  Settings,
  Bell,
  CircleHelp,
  UserPlus,
  Play,
  ChartNoAxesCombined,
  Users,
  FileText,
  History,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";

interface AdminSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
    staffRole?: string;
    staffId?: string;
    facultyId?: string;
  };
}

export function AdminSidebar({ user, ...props }: AdminSidebarProps) {
  const pathname = usePathname();
  const { update } = useSession();

  // Chrome variant per portal: admin (role 1), student (role 2),
  // registrar (role 3), dean (role 4), cashier (role 6, default)
  const variant =
    user?.role === "1"
      ? "admin"
      : user?.role === "2"
        ? "student"
        : user?.role === "3" || user?.staffRole === "registrar"
          ? "registrar"
          : user?.role === "4" || user?.staffRole === "dean"
            ? "dean"
            : "cashier";

  const roleDisplayName =
    variant === "admin"
      ? "Admin"
      : variant === "student"
        ? "Student"
        : variant === "registrar"
          ? "Registrar"
          : variant === "dean"
            ? "Dean"
            : "Cashier";

  const homeUrl =
    variant === "admin"
      ? "/admin/dashboard"
      : variant === "student"
        ? "/student/dashboard"
        : variant === "registrar"
          ? "/staff/registrar/dashboard"
          : variant === "dean"
            ? "/staff/dean/dashboard"
            : "/staff/cashier/dashboard";

  const adminNavMain = [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: LayoutDashboard,
      isActive: pathname === "/admin/dashboard",
    },
    {
      title: "Queue",
      url: "/admin/queue",
      icon: ListOrdered,
      isActive: pathname.startsWith("/admin/queue"),
    },
    {
      title: "Users",
      url: "/admin/users",
      icon: Users,
      isActive: pathname.startsWith("/admin/users"),
      items: [
        { title: "All Users", url: "/admin/users" },
        { title: "Staff Accounts", url: "/admin/users/staff" },
        { title: "Create Account", url: "/admin/users/create" },
      ],
    },
    {
      title: "History",
      url: "/admin/history",
      icon: History,
      isActive: pathname.startsWith("/admin/history"),
    },
    {
      title: "Reports",
      url: "/admin/reports",
      icon: ChartNoAxesCombined,
      isActive: pathname.startsWith("/admin/reports"),
    },
    {
      title: "Settings",
      url: "/admin/settings",
      icon: Settings,
      isActive: pathname.startsWith("/admin/settings"),
    },
  ];

  const deanNavMain = [
    {
      title: "Dashboard",
      url: "/staff/dean/dashboard",
      icon: LayoutDashboard,
      isActive: pathname === "/staff/dean/dashboard",
    },
    {
      title: "Queue",
      url: "/staff/dean/queue",
      icon: ListOrdered,
      isActive: pathname.startsWith("/staff/dean/queue"),
      items: [
        { title: "Serve Tickets", url: "/staff/dean/queue" },
        { title: "Queue History", url: "/staff/dean/queue?view=all" },
      ],
    },
    {
      title: "Reports",
      url: "/staff/dean/reports",
      icon: ChartNoAxesCombined,
      isActive: pathname.startsWith("/staff/dean/reports"),
    },
    {
      title: "Settings",
      url: "/staff/dean/settings",
      icon: Settings,
      isActive: pathname.startsWith("/staff/dean/settings"),
    },
  ];

  const cashierNavMain = [
    {
      title: "Dashboard",
      url: "/staff/cashier/dashboard",
      icon: LayoutDashboard,
      isActive: pathname === "/staff/cashier/dashboard",
    },
    {
      title: "Queue",
      url: "/staff/cashier/queue",
      icon: ListOrdered,
      isActive: pathname.startsWith("/staff/cashier/queue"),
      items: [
        { title: "Serve Tickets", url: "/staff/cashier/queue" },
        { title: "Queue History", url: "/staff/cashier/queue?view=all" },
      ],
    },
    {
      title: "Transactions",
      url: "/staff/cashier/transactions",
      icon: Receipt,
      isActive: pathname.startsWith("/staff/cashier/transactions"),
      items: [
        {
          title: "Tuition Payments",
          url: "/staff/cashier/transactions?type=tuition-payment",
        },
        {
          title: "Miscellaneous Fees",
          url: "/staff/cashier/transactions?type=miscellaneous-fee",
        },
        {
          title: "Document Payments",
          url: "/staff/cashier/transactions?type=document-payment",
        },
        {
          title: "Other School Fees",
          url: "/staff/cashier/transactions?type=other-school-fees",
        },
        {
          title: "Assessments",
          url: "/staff/cashier/transactions?type=assessment",
        },
      ],
    },
    {
      title: "Reports",
      url: "/staff/cashier/reports",
      icon: ChartColumn,
      isActive: pathname.startsWith("/staff/cashier/reports"),
    },
    {
      title: "Settings",
      url: "/staff/cashier/settings",
      icon: Settings,
      isActive: pathname.startsWith("/staff/cashier/settings"),
    },
  ];

  const registrarNavMain = [
    {
      title: "Dashboard",
      url: "/staff/registrar/dashboard",
      icon: LayoutDashboard,
      isActive: pathname === "/staff/registrar/dashboard",
    },
    {
      title: "Document Requests",
      url: "/staff/registrar/requests",
      icon: FileText,
      isActive: pathname.startsWith("/staff/registrar/requests"),
      items: [
        { title: "Pending", url: "/staff/registrar/requests?status=pending" },
        {
          title: "Processing",
          url: "/staff/registrar/requests?status=processing",
        },
        {
          title: "Ready for Pickup",
          url: "/staff/registrar/requests?status=ready-for-pickup",
        },
        { title: "All Requests", url: "/staff/registrar/requests" },
      ],
    },
  ];

  const studentNavMain = [
    {
      title: "Dashboard",
      url: "/student/dashboard",
      icon: LayoutDashboard,
      isActive: pathname === "/student/dashboard",
    },
    {
      title: "My Tickets",
      url: "/student/tickets",
      icon: ListOrdered,
      isActive: pathname.startsWith("/student/tickets"),
    },
    {
      title: "Documents",
      url: "/student/documents",
      icon: FileText,
      isActive: pathname.startsWith("/student/documents"),
    },
  ];

  const secondaryBase =
    variant === "admin"
      ? "/admin"
      : variant === "student"
        ? "/student"
        : `/staff/${variant}`;

  const navSecondary = [
    {
      title: "Notifications",
      url: `${secondaryBase}/notifications`,
      icon: Bell,
    },
    {
      title: "Help & Support",
      url: `${secondaryBase}/support`,
      icon: CircleHelp,
    },
  ];

  const projectsByVariant = {
    admin: [
      { name: "Create Account", url: "/admin/users/create", icon: UserPlus },
      { name: "View Queue", url: "/admin/queue", icon: Play },
      { name: "Reports", url: "/admin/reports", icon: ChartNoAxesCombined },
    ],
    dean: [
      { name: "Serve Next", url: "/staff/dean/queue", icon: Play },
      {
        name: "Today's Report",
        url: "/staff/dean/reports",
        icon: ChartNoAxesCombined,
      },
      {
        name: "All Tickets",
        url: "/staff/dean/queue?view=all",
        icon: ListOrdered,
      },
    ],
    cashier: [
      { name: "Serve Next", url: "/staff/cashier/queue", icon: Play },
      {
        name: "Today's Report",
        url: "/staff/cashier/reports",
        icon: ChartColumn,
      },
      {
        name: "All Transactions",
        url: "/staff/cashier/transactions",
        icon: Receipt,
      },
    ],
    registrar: [
      {
        name: "Pending Requests",
        url: "/staff/registrar/requests?status=pending",
        icon: Play,
      },
    ],
    student: [
      {
        name: "New Document Request",
        url: "/student/documents",
        icon: FileText,
      },
      { name: "Live Queue", url: "/live-queue", icon: Play },
    ],
  } as const;

  const projects = [...projectsByVariant[variant]];

  const navMain =
    variant === "admin"
      ? adminNavMain
      : variant === "student"
        ? studentNavMain
        : variant === "registrar"
          ? registrarNavMain
          : variant === "dean"
            ? deanNavMain
            : cashierNavMain;

  const handleLogout = async () => {
    const result = await logoutAction();
    if (result.success) {
      await update();
      window.location.href = "/";
    }
  };

  const userData = {
    name: user?.name || roleDisplayName,
    email: user?.email || "",
    avatar: "",
    role: roleDisplayName,
    onLogout: handleLogout,
  };

  return (
    <Sidebar
      collapsible="icon"
      className="[&_[data-sidebar=sidebar]]:bg-[#EFEFEF]"
      {...props}
      style={
        {
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "3.5rem",
        } as React.CSSProperties
      }
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href={homeUrl}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden bg-white">
                  <Image
                    src="/images/bcc-logo-3.png"
                    alt="BCC Logo"
                    width={32}
                    height={32}
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <span
                    className="truncate text-sm font-semibold"
                    style={{ fontFamily: "var(--font-geist-sans)" }}
                  >
                    BCC {roleDisplayName}
                  </span>
                  <span
                    className="truncate text-[11px] text-muted-foreground font-medium"
                    style={{ fontFamily: "var(--font-geist-sans)" }}
                  >
                    Queue System
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="overflow-auto">
        <NavMain items={navMain} />
        <NavProjects projects={projects} />
        <NavSecondary items={navSecondary} className="mt-auto pt-2 border-t" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
