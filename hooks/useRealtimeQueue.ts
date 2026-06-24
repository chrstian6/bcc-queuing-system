// hooks/useRealtimeQueue.ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface DepartmentQueue {
  department: string;
  displayName: string;
  serving: string | null;
  waiting: number;
  color: string;
}

interface UseRealtimeQueueReturn {
  departments: DepartmentQueue[];
  isConnected: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

export function useRealtimeQueue(): UseRealtimeQueueReturn {
  const [departments, setDepartments] = useState<DepartmentQueue[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource("/api/public/queue-stream");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.error) {
          setError(data.error);
          return;
        }

        if (data.departments) {
          setDepartments((prev) => {
            const prevStr = JSON.stringify(prev);
            const newStr = JSON.stringify(data.departments);
            if (prevStr === newStr) return prev;
            return data.departments;
          });
          setLastUpdated(new Date(data.timestamp));
        }
      } catch (err) {
        console.error("Error parsing SSE data:", err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();

      // Reconnect after 3 seconds
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return {
    departments,
    isConnected,
    lastUpdated,
    error,
  };
}
