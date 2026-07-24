// components/nav-secondary.tsx
"use client";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface NavSecondaryItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

export function NavSecondary({
  items,
  className,
}: {
  items: NavSecondaryItem[];
  className?: string;
}) {
  return (
    <SidebarGroup className={className}>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild tooltip={item.title}>
              <Link href={item.url}>
                <item.icon strokeWidth={1} />
                <span style={{ fontFamily: "var(--font-geist-sans)" }}>
                  {item.title}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
