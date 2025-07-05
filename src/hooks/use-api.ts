"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { enhancedFetch, handleError, useErrorHandler, type ErrorContext } from "@/lib/error-handler"

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isStale: boolean;
}

interface ApiOptions {
  enabled?: boolean;
  retryOnMount?: boolean;
  staleTime?: number;
  cacheTime?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  context?: ErrorContext;
}

// Simple cache implementation
const cache = new Map<string, { data: any; timestamp: number; staleTime: number }>()

// Circuit breaker to prevent infinite retries
const failureCount = new Map<string, { count: number; lastFailure: number }>()
const CIRCUIT_BREAKER_THRESHOLD = 3
const CIRCUIT_BREAKER_TIMEOUT = 30000 // 30 seconds

export function useApi<T>(
  url: string, 
  dependencies: any[] = [], 
  options: ApiOptions = {}
): ApiState<T> {
  const {
    enabled = true,
    retryOnMount = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes
    onSuccess,
    onError,
    context
  } = options

  const [state, setState] = useState<Omit<ApiState<T>, "refetch">>({
    data: null,
    loading: true,
    error: null,
    isStale: false,
  })

  const { withRetry } = useErrorHandler()
  const abortControllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  // Reset mounted ref on each render to handle React Strict Mode
  mountedRef.current = true

  // Check cache first
  const getCachedData = useCallback((cacheKey: string) => {
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < cached.staleTime) {
      return { data: cached.data, isStale: false }
    }
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      return { data: cached.data, isStale: true }
    }
    return null
  }, [cacheTime])

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled || !url) return

    // Check circuit breaker
    const failure = failureCount.get(url)
    if (failure && failure.count >= CIRCUIT_BREAKER_THRESHOLD) {
      const timeSinceLastFailure = Date.now() - failure.lastFailure
      if (timeSinceLastFailure < CIRCUIT_BREAKER_TIMEOUT) {
        console.warn(`Circuit breaker open for ${url}, skipping request`)
        return
      } else {
        // Reset circuit breaker after timeout
        failureCount.delete(url)
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const cacheKey = url

    // Check cache unless forcing refresh
    if (!forceRefresh) {
      const cached = getCachedData(cacheKey)
      if (cached) {
        setState(prev => ({
          ...prev,
          data: cached.data,
          loading: false,
          error: null,
          isStale: cached.isStale,
        }))

        // If data is stale, fetch in background
        if (!cached.isStale) {
          return
        }
      }
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    try {
      setState(prev => ({ 
        ...prev, 
        loading: prev.data ? false : true, // Don't show loading if we have cached data
        error: null 
      }))

      const operation = async () => {
        const response = await fetch(url, {
          credentials: "include",
          signal: abortControllerRef.current?.signal,
          headers: {
            "Cache-Control": forceRefresh ? "no-cache" : "max-age=300",
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const error = new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
          (error as any).status = response.status
          throw error
        }

        return await response.json()
      }

      const result = await withRetry(operation, {
        ...context,
        component: "useApi",
        action: "fetch",
        metadata: { url }
      })

      // Only update state if component is still mounted
      if (mountedRef.current) {
        const data = result.success !== undefined ? result : result

        // Cache the result
        cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          staleTime
        })

        setState({
          data,
          loading: false,
          error: null,
          isStale: false,
        })

        onSuccess?.(data)

        // Reset circuit breaker on success
        failureCount.delete(url)
      }
    } catch (error: any) {
      // Update circuit breaker on failure
      const failure = failureCount.get(url) || { count: 0, lastFailure: 0 }
      failure.count += 1
      failure.lastFailure = Date.now()
      failureCount.set(url, failure)

      // Only update state if component is still mounted and error wasn't from abort
      if (mountedRef.current && error.name !== "AbortError") {
        const errorMessage = error.message || "An error occurred"

        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }))

        // Handle error with our error system - but don't show toast for network errors
        if (onError) {
          onError(error)
        } else if (error.code !== "NETWORK_ERROR") {
          handleError(error, {
            ...context,
            component: "useApi",
            action: "fetch",
            metadata: { url }
          })
        }
      }
    }
  }, [url, enabled, context, onSuccess, onError, staleTime])

  // Effect for initial fetch and dependency changes
  useEffect(() => {
    if (enabled) {
      fetchData()
    }

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [url, enabled, ...dependencies])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const fetchDataRef = useRef(fetchData)
  fetchDataRef.current = fetchData

  const refetch = useCallback(() => {
    fetchDataRef.current(true)
  }, [])

  return {
    ...state,
    refetch,
  }
}

// Enhanced mutation hook for POST/PUT/DELETE operations
export function useMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: any, variables: TVariables) => void;
    context?: ErrorContext;
  } = {}
) {
  const [state, setState] = useState({
    data: null as TData | null,
    loading: false,
    error: null as string | null,
  })

  const { withRetry } = useErrorHandler()
  const { onSuccess, onError, context } = options

  const mutate = useCallback(async (variables: TVariables) => {
    setState({ data: null, loading: true, error: null })

    try {
      const operation = () => mutationFn(variables)
      
      const result = await withRetry(operation, {
        ...context,
        component: "useMutation",
        action: "mutate"
      })

      setState({ data: result, loading: false, error: null })
      onSuccess?.(result, variables)
      
      return result
    } catch (error: any) {
      const errorMessage = error.message || "An error occurred"
      setState({ data: null, loading: false, error: errorMessage })
      
      if (onError) {
        onError(error, variables)
      } else {
        handleError(error, {
          ...context,
          component: "useMutation",
          action: "mutate"
        })
      }
      
      throw error
    }
  }, [mutationFn, withRetry, context, onSuccess, onError])

  return {
    ...state,
    mutate,
    reset: () => setState({ data: null, loading: false, error: null }),
  }
}

export function useShifts() {
  return useApi<{ shifts: any[] }>("/api/shifts")
}

export function useTodaysShifts() {
  return useApi<{ shifts: any[] }>("/api/shifts/today")
}

export function useShiftsByDate(dateFilter: string = "today", statusFilter: string = "all", clientFilter: string = "all", searchTerm: string = "") {
  const params = new URLSearchParams({
    filter: dateFilter,
    status: statusFilter,
    client: clientFilter,
    search: searchTerm,
  })
  return useApi<{ shifts: any[], dateRange?: any }>(`/api/shifts/by-date?${params.toString()}`)
}

export function useShift(id: string) {
  const { data, ...rest } = useApi<{ shift: any }>(`/api/shifts/${id}`, [id])
  return { data: data?.shift, ...rest }
}

export function useAnnouncements() {
  return useApi<{ announcements: any[] }>("/api/announcements")
}

export function useTimesheets() {
  return useApi<{ timesheets: any[] }>("/api/timesheets")
}

export function useClients() {
  return useApi<{ clients: any[] }>("/api/clients")
}

export function useJobs() {
  return useApi<{ jobs: any[] }>("/api/jobs")
}

export function useRecentJobs() {
  return useApi<{ jobs: any[] }>("/api/jobs/recent")
}

export function useJob(id: string) {
  return useApi<{ job: any }>(`/api/jobs/${id}`, [id])
}

export function useClientJobs(clientId: string) {
  return useApi<{ jobs: any[] }>(`/api/clients/${clientId}/jobs`, [clientId])
}
