// app/staff/[role]/queue/page.tsx
"use client";

import { useState, Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Ticket, ListChecks, AlertCircle, Loader2 } from "lucide-react";
import { ServeTicketView } from "@/components/registrar/ServeTicketView";
import { AllTicketsView } from "@/components/registrar/AllTicketsView";
import { getSession } from "@/actions/auth";

type QueueView = "serve" | "all";

const FONT = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

function QueueContent() {
  const params = useParams();
  const router = useRouter();
  const role = params.role as string;
  const [currentView, setCurrentView] = useState<QueueView>("serve");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const sessionResult = await getSession();

        if (!sessionResult.success || !sessionResult.session) {
          router.push("/?error=unauthorized");
          return;
        }

        const sessionUser = sessionResult.session.user as any;

        // Check if the URL role matches the user's actual role
        if (sessionUser?.roleName) {
          // If URL role doesn't match session role, redirect to correct URL
          if (sessionUser.roleName !== role) {
            router.replace(`/staff/${sessionUser.roleName}/queue`);
            return;
          }
        }
      } catch (err) {
        console.error("Error checking session:", err);
        setError("Failed to load session");
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [role, router]);

  const tabs = [
    { id: "serve" as const, label: "Serve", icon: Ticket },
    { id: "all" as const, label: "History", icon: ListChecks },
  ];

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-500" style={FONT}>
            Loading queue...
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-sm text-gray-500 text-center" style={FONT}>
          {error}
        </p>
      </div>
    );
  }

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
      {currentView === "serve" && (
        <ServeTicketView department={role} key={role} />
      )}
      {currentView === "all" && <AllTicketsView department={role} key={role} />}
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5 h-10">
        <div className="flex-1 bg-white rounded-md shadow-sm" />
        <div className="flex-1" />
      </div>

      <div>
        <div className="flex items-center justify-between pb-3 mb-1">
          <div className="flex items-center gap-3">
            <div className="h-5 w-20 bg-gray-100 rounded-full" />
            <div className="h-5 w-32 bg-gray-100 rounded-full" />
          </div>
          <div className="h-5 w-14 bg-gray-100 rounded-full" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 lg:divide-x divide-gray-100">
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

            <div className="flex items-center gap-2 pt-5 mt-6 border-t border-gray-100">
              <div className="h-8 w-16 bg-gray-100 rounded-full" />
              <div className="flex-1" />
              <div className="h-8 w-20 bg-gray-100 rounded-full" />
              <div className="h-8 w-14 bg-gray-100 rounded-full" />
              <div className="h-8 w-16 bg-gray-100 rounded-full" />
            </div>
          </div>

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
