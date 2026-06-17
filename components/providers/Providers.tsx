// components/providers/Providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
    </SessionProvider>
  );
}
