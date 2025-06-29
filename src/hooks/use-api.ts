"use client"

import { useState, useEffect } from 'react';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApi<T>(url: string, dependencies: any[] = []): ApiState<T> {
  const [state, setState] = useState<Omit<ApiState<T>, 'refetch'>>({
    data: null,
    loading: true,
    error: null,
  });

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

      setState({
        data: result.success ? result : result,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, [url, ...dependencies]);

  const refetch = () => {
    fetchData();
  };

  return {
    ...state,
    refetch,
  };
}

export function useShifts() {
  return useApi<{ shifts: any[] }>('/api/shifts');
}

export function useTodaysShifts() {
  return useApi<{ shifts: any[] }>('/api/shifts/today');
}

export function useShiftsByDate(dateFilter: string = 'today') {
  return useApi<{ shifts: any[], dateRange?: any }>(`/api/shifts/by-date?filter=${dateFilter}`);
}

export function useShift(id: string) {
  return useApi<{ shift: any }>(`/api/shifts/${id}`, [id]);
}

export function useAnnouncements() {
  return useApi<{ announcements: any[] }>('/api/announcements');
}

export function useTimesheets() {
  return useApi<{ timesheets: any[] }>('/api/timesheets');
}

export function useClients() {
  return useApi<{ clients: any[] }>('/api/clients');
}

export function useJobs() {
  return useApi<{ jobs: any[] }>('/api/jobs');
}

export function useRecentJobs() {
  return useApi<{ jobs: any[] }>('/api/jobs/recent');
}

export function useJob(id: string) {
  return useApi<{ job: any }>(`/api/jobs/${id}`, [id]);
}

export function useClientJobs(clientId: string) {
  return useApi<{ jobs: any[] }>(`/api/clients/${clientId}/jobs`, [clientId]);
}
