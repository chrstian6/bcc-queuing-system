// components/admin/AdminSidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Users,
  Clock,
  Ticket,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Bell,
  FileText,
  ScrollText,
  GraduationCap,
  UserPlus,
  Shield,
  Activity,
  Monitor,
  UserCog,
  ListChecks,
  Receipt,
} from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface AdminSidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
}

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin/dashboard",
  },
  {
    title: "Queue Management",
    icon: Clock,
    href: "/admin/queue",
    items: [
      { title: "Active Queue", href: "/admin/queue/active", icon: Users },
      { title: "Serve Ticket", href: "/admin/queue/serve", icon: Ticket },
      { title: "All Tickets", href: "/admin/queue/all", icon: ListChecks },
    ],
  },
  {
    title: "Ticket Requests",
    icon: FileText,
    href: "/admin/tickets",
    items: [
      {
        title: "Certificate",
        href: "/admin/tickets/certificate",
        icon: ScrollText,
      },
      { title: "TOR", href: "/admin/tickets/tor", icon: GraduationCap },
      { title: "Grades", href: "/admin/tickets/grades", icon: BarChart3 },
      { title: "Assessment", href: "/admin/tickets/assessment", icon: Receipt },
    ],
  },
  {
    title: "User Management",
    icon: UserCog,
    href: "/admin/users",
    items: [
      { title: "All Users", href: "/admin/users", icon: Users },
      { title: "Create Account", href: "/admin/users/create", icon: UserPlus },
      { title: "Staff Accounts", href: "/admin/users/staff", icon: Shield },
      {
        title: "Student Accounts",
        href: "/admin/users/students",
        icon: GraduationCap,
      },
    ],
  },
  {
    title: "System Monitor",
    icon: Monitor,
    href: "/admin/monitor",
    items: [
      { title: "System Logs", href: "/admin/monitor/logs", icon: Activity },
      {
        title: "Queue Analytics",
        href: "/admin/monitor/analytics",
        icon: BarChart3,
      },
      {
        title: "Performance",
        href: "/admin/monitor/performance",
        icon: Monitor,
      },
    ],
  },
  {
    title: "Reports",
    icon: BarChart3,
    href: "/admin/reports",
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/admin/settings",
  },
];

export function AdminSidebar({ user }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { update } = useSession();

  const handleLogout = async () => {
    const result = await logoutAction();
    if (result.success) {
      await update();
      window.location.href = "/";
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Sidebar Overlay for Mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-[#1B5A8C] text-white transition-all duration-300",
          collapsed ? "w-[70px]" : "w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        style={{ fontFamily: "var(--font-geist-sans)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10">
          <Avatar className="h-8 w-8 bg-white/20">
            <AvatarFallback
              className="text-white font-bold text-sm"
              style={{ fontFamily: "var(--font-geist-sans)" }}
            >
              BCC
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h1
                className="text-sm font-bold truncate"
                style={{ fontFamily: "var(--font-geist-sans)" }}
              >
                BCC Admin
              </h1>
              <p
                className="text-xs text-white/60 truncate"
                style={{ fontFamily: "var(--font-geist-sans)" }}
              >
                Queue System
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");

              if (item.items) {
                return (
                  <CollapsibleMenuItem
                    key={item.title}
                    item={item}
                    collapsed={collapsed}
                    pathname={pathname}
                  />
                );
              }

              return (
                <Tooltip key={item.title} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-white/20 text-white"
                          : "text-white/70 hover:text-white hover:bg-white/10",
                        collapsed && "justify-center px-2",
                      )}
                      style={{ fontFamily: "var(--font-geist-sans)" }}
                      onClick={() => setMobileOpen(false)}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      <span style={{ fontFamily: "var(--font-geist-sans)" }}>
                        {item.title}
                      </span>
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </nav>
        </ScrollArea>

        {/* User Section */}
        <div className="border-t border-white/10 p-3">
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full text-white/70 hover:text-white hover:bg-white/10"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span style={{ fontFamily: "var(--font-geist-sans)" }}>
                  Logout
                </span>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-2">
                <Avatar className="h-8 w-8 bg-white/20">
                  <AvatarFallback
                    className="text-white text-xs"
                    style={{ fontFamily: "var(--font-geist-sans)" }}
                  >
                    {user?.name?.charAt(0) || "A"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ fontFamily: "var(--font-geist-sans)" }}
                  >
                    {user?.name || "Admin"}
                  </p>
                  <p
                    className="text-xs text-white/60 truncate"
                    style={{ fontFamily: "var(--font-geist-sans)" }}
                  >
                    {user?.email}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-white/70 hover:text-white hover:bg-white/10"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  <Bell className="h-4 w-4 mr-1" />
                  Alerts
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/70 hover:text-white hover:bg-white/10"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// Collapsible Menu Item Component
function CollapsibleMenuItem({
  item,
  collapsed,
  pathname,
}: {
  item: any;
  collapsed: boolean;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const isActive = item.items?.some(
    (sub: any) => pathname === sub.href || pathname.startsWith(sub.href + "/"),
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            onClick={() => setOpen(!open)}
            className={cn(
              "w-full flex items-center justify-center px-2 py-2 rounded-lg text-sm transition-colors",
              isActive
                ? "bg-white/20 text-white"
                : "text-white/70 hover:text-white hover:bg-white/10",
            )}
          >
            <item.icon className="h-5 w-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <span style={{ fontFamily: "var(--font-geist-sans)" }}>
            {item.title}
          </span>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
          isActive
            ? "bg-white/20 text-white"
            : "text-white/70 hover:text-white hover:bg-white/10",
        )}
        style={{ fontFamily: "var(--font-geist-sans)" }}
      >
        <item.icon className="h-5 w-5 flex-shrink-0" />
        <span className="flex-1 text-left">{item.title}</span>
        <ChevronRight
          className={cn("h-4 w-4 transition-transform", open && "rotate-90")}
        />
      </button>
      {open && (
        <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-4">
          {item.items.map((sub: any) => {
            const isSubActive = pathname === sub.href;
            return (
              <Link
                key={sub.title}
                href={sub.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors",
                  isSubActive
                    ? "bg-white/20 text-white"
                    : "text-white/60 hover:text-white hover:bg-white/10",
                )}
                style={{ fontFamily: "var(--font-geist-sans)" }}
              >
                <sub.icon className="h-3.5 w-3.5" />
                {sub.title}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
