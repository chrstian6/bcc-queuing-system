// app/staff/[role]/queue/page.tsx
"use client";

import { useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { Ticket, ListChecks } from "lucide-react";
import { ServeTicketView } from "@/components/registrar/ServeTicketView";
import { AllTicketsView } from "@/components/registrar/AllTicketsView";

type QueueView = "serve" | "all";

const FONT = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

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
      {/* Tabs Navigation */}
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
            style={FONT}
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

function QueueSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Tabs Skeleton */}
      <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5 h-10">
        <div className="flex-1 bg-white rounded-md shadow-sm" />
        <div className="flex-1" />
      </div>

      {/* Serve View Skeleton */}
      <div>
        {/* Top Bar */}
        <div className="flex items-center justify-between pb-3 mb-1">
          <div className="flex items-center gap-3">
            <div className="h-5 w-20 bg-gray-100 rounded-full" />
            <div className="h-5 w-32 bg-gray-100 rounded-full" />
          </div>
          <div className="h-5 w-14 bg-gray-100 rounded-full" />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 lg:divide-x divide-gray-100">
          {/* Now Serving */}
          <div className="lg:col-span-3 py-6 lg:pr-8">
            <div className="h-3 w-20 bg-gray-100 rounded-full mb-4" />
            <div className="space-y-6">
              <div className="mb-6">
                <div className="h-5 w-48 bg-gray-100 rounded-full mb-2" />
                <div className="h-4 w-32 bg-gray-100 rounded-full" />
              </div>
              <div className="space-y-2.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2.5 border-b border-gray-50"
                  >
                    <div className="h-3 w-16 bg-gray-100 rounded-full" />
                    <div className="h-3 w-20 bg-gray-100 rounded-full" />
                  </div>
                ))}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 pt-5 mt-6 border-t border-gray-100">
              <div className="h-8 w-16 bg-gray-100 rounded-full" />
              <div className="flex-1" />
              <div className="h-8 w-20 bg-gray-100 rounded-full" />
              <div className="h-8 w-14 bg-gray-100 rounded-full" />
              <div className="h-8 w-16 bg-gray-100 rounded-full" />
            </div>
          </div>

          {/* Queue */}
          <div className="lg:col-span-2 py-6 lg:pl-8">
            <div className="h-3 w-12 bg-gray-100 rounded-full mb-5" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <div className="h-9 w-9 bg-gray-100 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-36 bg-gray-100 rounded-full" />
                    <div className="h-3 w-56 bg-gray-100 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QueuePage() {
  return (
    <Suspense fallback={<QueueSkeleton />}>
      <QueueContent />
    </Suspense>
  );
}
