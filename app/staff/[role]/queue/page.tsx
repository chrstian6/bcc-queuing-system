// app/staff/[role]/queue/page.tsx
"use client";

import { useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { Ticket, ListChecks } from "lucide-react";
import { ServeTicketView } from "@/components/registrar/ServeTicketView";
import { AllTicketsView } from "@/components/registrar/AllTicketsView";

type QueueView = "serve" | "all";

function QueueContent() {
  const params = useParams();
  const role = params.role as string;
  const [currentView, setCurrentView] = useState<QueueView>("serve");

  const tabs = [
    { id: "serve" as const, label: "Serve", icon: Ticket },
    { id: "all" as const, label: "History", icon: ListChecks },
  ];

  return (
    <div className="space-y-5">
      {/* Tabs Navigation - Flat Design */}
      <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCurrentView(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all duration-150 ${
              currentView === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dynamic View */}
      {currentView === "serve" && <ServeTicketView department={role} />}
      {currentView === "all" && <AllTicketsView department={role} />}
    </div>
  );
}

export default function QueuePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="w-5 h-5 border-2 border-[#1B5A8C] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <QueueContent />
    </Suspense>
  );
}
