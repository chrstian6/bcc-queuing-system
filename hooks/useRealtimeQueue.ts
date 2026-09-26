// hooks/useRealtimeQueue.ts
"use client";

import { useState, useEffect, useRef } from "react";

interface DepartmentQueue {
  department: string;
  displayName: string;
  serving: string | null;
  waiting: number;
  color?: string;
  windows?: { number: string; serving: string | null; waiting: number }[];
}

interface UseRealtimeQueueReturn {
  departments: DepartmentQueue[];
  isConnected: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

export function useRealtimeQueue(): UseRealtimeQueueReturn {
  const [departments, setDepartments] = useState<DepartmentQueue[]>([
    {
      department: "dean",
      displayName: "Dean's Office",
      serving: null,
      waiting: 0,
    },
    {
      department: "registrar",
      displayName: "Registrar",
      serving: null,
      waiting: 0,
    },
    {
      department: "cashier",
      displayName: "Cashier",
      serving: null,
      waiting: 0,
    },
  ]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const errorCountRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    let reconnectTimeout: NodeJS.Timeout;
    let eventSource: EventSource | null = null;

    const connect = () => {
      if (!mountedRef.current) return;

      // Don't retry endlessly if the endpoint doesn't exist
      if (errorCountRef.current >= 5) {
        setError("Live queue temporarily unavailable");
        setIsConnected(false);
        return;
      }

      try {
        eventSource = new EventSource("/api/public/queue-stream-full");
      } catch (err) {
        console.error("EventSource failed to open:", err);
        errorCountRef.current++;
        reconnectTimeout = setTimeout(connect, 5000 * errorCountRef.current);
        return;
      }

      eventSource.onopen = () => {
        if (mountedRef.current) {
          setIsConnected(true);
          setError(null);
          errorCountRef.current = 0;
        }
      };

      eventSource.onmessage = (event) => {
        if (!mountedRef.current) return;
        // Ignore empty heartbeats
        if (!event.data || event.data.trim() === "") return;

        try {
          const data = JSON.parse(event.data);
          if (data.departments && data.departments.length > 0) {
            setDepartments(data.departments);
            setLastUpdated(new Date(data.timestamp));
          }
        } catch (err) {
          console.error(
            "SSE parse error:",
            err,
            "Raw:",
            event.data.slice(0, 100),
          );
        }
      };

      eventSource.onerror = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        errorCountRef.current++;
        eventSource?.close();
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(
          connect,
          5000 * Math.min(errorCountRef.current, 6),
        );
      };
    };

    connect();

    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimeout);
      eventSource?.close();
    };
  }, []);

  return { departments, isConnected, lastUpdated, error };
}
