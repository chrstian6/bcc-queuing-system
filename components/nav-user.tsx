// components/nav-user.tsx
"use client";

import { ChevronsUpDown, Circle, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface NavUserProps {
  user: {
    name: string;
    email: string;
    avatar: string;
    role: string;
    onLogout?: () => void;
  };
}

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar();
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarFallback
                  className="rounded-lg bg-[#1B5A8C] text-white text-xs font-semibold"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span
                  className="truncate font-semibold"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  {user.name}
                </span>
                <span
                  className="truncate text-xs"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  {user.role}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarFallback
                    className="rounded-lg bg-[#1B5A8C] text-white text-xs font-semibold"
                    style={{ fontFamily: "var(--font-geist-sans)" }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span
                    className="truncate font-semibold"
                    style={{ fontFamily: "var(--font-geist-sans)" }}
                  >
                    {user.name}
                  </span>
                  <span
                    className="truncate text-xs"
                    style={{ fontFamily: "var(--font-geist-sans)" }}
                  >
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <Circle strokeWidth={1} />
                <span style={{ fontFamily: "var(--font-geist-sans)" }}>
                  Account
                </span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={user.onLogout}>
              <LogOut strokeWidth={1} />
              <span style={{ fontFamily: "var(--font-geist-sans)" }}>
                Log out
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
