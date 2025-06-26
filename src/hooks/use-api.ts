"use client"

import { useState, useEffect } from 'react';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(url: string, dependencies: any[] = []): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isCancelled = false;

    const fetchData = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        const response = await fetch(url, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!isCancelled) {
          setState({
            data: result.success ? result : result,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        if (!isCancelled) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : 'An error occurred',
          });
        }
      }
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [url, ...dependencies]);

  return state;
}

export function useShifts() {
  return useApi<{ shifts: any[] }>('/api/shifts');
}

export function useShift(id: string) {
  return useApi<{ shift: any }>(`/api/shifts/${id}`, [id]);
}

export function useAnnouncements() {
  return useApi<{ announcements: any[] }>('/api/announcements');
}
