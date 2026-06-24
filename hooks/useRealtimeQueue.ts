// hooks/useRealtimeQueue.ts - Final clean version
"use client";

import { useState, useEffect, useRef } from "react";

interface DepartmentQueue {
  department: string;
  displayName: string;
  serving: string | null;
  waiting: number;
  color?: string;
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

  useEffect(() => {
    mountedRef.current = true;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      if (!mountedRef.current) return;

      const eventSource = new EventSource("/api/public/queue-stream-full");

      eventSource.onopen = () => {
        if (mountedRef.current) {
          setIsConnected(true);
          setError(null);
        }
      };

      eventSource.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          if (data.departments && data.departments.length > 0) {
            setDepartments(data.departments);
            setLastUpdated(new Date(data.timestamp));
          }
        } catch (err) {
          console.error("SSE parse error:", err);
        }
      };

      eventSource.onerror = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        eventSource.close();
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimeout);
    };
  }, []);

  return { departments, isConnected, lastUpdated, error };
}
