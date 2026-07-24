// components/nav-projects.tsx
"use client";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface ProjectItem {
  name: string;
  url: string;
  icon: LucideIcon;
}

export function NavProjects({ projects }: { projects: ProjectItem[] }) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ fontFamily: "var(--font-geist-sans)" }}
      >
        Quick Actions
      </SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              <Link href={item.url}>
                <item.icon strokeWidth={1} />
                <span
                  className="text-sm font-medium"
                  style={{ fontFamily: "var(--font-geist-sans)" }}
                >
                  {item.name}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
