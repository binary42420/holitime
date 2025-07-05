interface CacheEntry<T> {
  data: T
  timestamp: number
  staleTime: number
  tags: string[]
}

interface CacheConfig {
  defaultStaleTime: number
  maxSize: number
  cleanupInterval: number
}

class EnhancedCache {
  private cache = new Map<string, CacheEntry<any>>()
  private config: CacheConfig
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultStaleTime: 5 * 60 * 1000, // 5 minutes
      maxSize: 1000,
      cleanupInterval: 10 * 60 * 1000, // 10 minutes
      ...config
    }

    this.startCleanupTimer()
  }

  set<T>(
    key: string, 
    data: T, 
    staleTime: number = this.config.defaultStaleTime,
    tags: string[] = []
  ): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest()
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      staleTime,
      tags
    })
  }

  get<T>(key: string): { data: T; isStale: boolean } | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const age = Date.now() - entry.timestamp
    const isStale = age > entry.staleTime

    return {
      data: entry.data,
      isStale
    }
  }

  invalidate(key: string): boolean {
    return this.cache.delete(key)
  }

  invalidateByTag(tag: string): number {
    let count = 0
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key)
        count++
      }
    }
    return count
  }

  invalidateByPattern(pattern: RegExp): number {
    let count = 0
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key)
        count++
      }
    }
    return count
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  getStats(): {
    size: number
    maxSize: number
    oldestEntry: number | null
    newestEntry: number | null
    } {
    let oldest: number | null = null
    let newest: number | null = null

    for (const entry of this.cache.values()) {
      if (oldest === null || entry.timestamp < oldest) {
        oldest = entry.timestamp
      }
      if (newest === null || entry.timestamp > newest) {
        newest = entry.timestamp
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      oldestEntry: oldest,
      newestEntry: newest
    }
  }

  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      // Remove entries older than 1 hour regardless of stale time
      if (now - entry.timestamp > 60 * 60 * 1000) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.clear()
  }
}

// Global cache instance
export const globalCache = new EnhancedCache({
  defaultStaleTime: 5 * 60 * 1000, // 5 minutes
  maxSize: 1000,
  cleanupInterval: 10 * 60 * 1000 // 10 minutes
})

// Cache key generators
export const cacheKeys = {
  shifts: (filter?: string) => `shifts${filter ? `-${filter}` : ""}`,
  shift: (id: string) => `shift-${id}`,
  shiftAssignments: (id: string) => `shift-assignments-${id}`,
  todaysShifts: () => "shifts-today",
  shiftsByDate: (date: string, status: string, client: string, search: string) => 
    `shifts-by-date-${date}-${status}-${client}-${search}`,
  timesheets: (filter?: string) => `timesheets${filter ? `-${filter}` : ""}`,
  clients: () => "clients",
  jobs: (clientId?: string) => `jobs${clientId ? `-${clientId}` : ""}`,
  recentJobs: () => "jobs-recent",
  announcements: () => "announcements",
  conflicts: (employeeId: string, shiftId: string, date: string) => 
    `conflicts-${employeeId}-${shiftId}-${date}`,
  employeeSuggestions: (roleCode: string, date: string, startTime: string, endTime: string) =>
    `employee-suggestions-${roleCode}-${date}-${startTime}-${endTime}`
}

// Cache tags for invalidation
export const cacheTags = {
  shifts: "shifts",
  timesheets: "timesheets",
  clients: "clients",
  jobs: "jobs",
  announcements: "announcements",
  assignments: "assignments",
  conflicts: "conflicts"
}

// Helper functions for common cache operations
export const cacheHelpers = {
  invalidateShiftData: () => {
    globalCache.invalidateByTag(cacheTags.shifts)
    globalCache.invalidateByTag(cacheTags.assignments)
    globalCache.invalidateByTag(cacheTags.conflicts)
  },

  invalidateTimesheetData: () => {
    globalCache.invalidateByTag(cacheTags.timesheets)
  },

  invalidateJobData: () => {
    globalCache.invalidateByTag(cacheTags.jobs)
  },

  invalidateClientData: () => {
    globalCache.invalidateByTag(cacheTags.clients)
    globalCache.invalidateByTag(cacheTags.jobs)
  },

  invalidateAll: () => {
    globalCache.clear()
  }
}

// React hook for cache management
export function useCache() {
  return {
    cache: globalCache,
    keys: cacheKeys,
    tags: cacheTags,
    helpers: cacheHelpers
  }
}
