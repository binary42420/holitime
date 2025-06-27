/**
 * Utility functions for creating SEO-friendly URLs with company, job, and date slugs
 */

/**
 * Convert a string to a URL-friendly slug
 */
export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

/**
 * Convert a date to a URL-friendly format (YYYY-MM-DD)
 */
export function createDateSlug(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toISOString().split('T')[0] // Returns YYYY-MM-DD format
}

/**
 * Generate a shift identifier from start time and optional sequence number
 */
export function createShiftIdentifier(startTime: string, sequence?: number): string {
  // Convert time format from "HH:MM" to "HHMM" and add sequence if provided
  if (!startTime) {
    throw new Error('startTime is required for createShiftIdentifier')
  }
  const timeSlug = startTime.replace(':', '')
  return sequence ? `${timeSlug}-${sequence}` : timeSlug
}

/**
 * Generate a complete shift URL using company name, job name, date, and shift identifier
 */
export function generateShiftUrl(companyName: string, jobName: string, date: string | Date, startTime: string, sequence?: number): string {
  const companySlug = createSlug(companyName)
  const jobSlug = createSlug(jobName)
  const dateSlug = createDateSlug(date)
  const shiftId = createShiftIdentifier(startTime, sequence)

  return `/shifts/${encodeURIComponent(companySlug)}/${encodeURIComponent(jobSlug)}/${encodeURIComponent(dateSlug)}/${encodeURIComponent(shiftId)}`
}

/**
 * Generate edit URL for a shift
 */
export function generateShiftEditUrl(companyName: string, jobName: string, date: string | Date, startTime: string, sequence?: number): string {
  return `${generateShiftUrl(companyName, jobName, date, startTime, sequence)}/edit`
}

/**
 * Parse URL parameters back to readable names
 */
export function parseShiftUrl(companySlug: string, jobSlug: string, dateSlug: string, shiftIdSlug?: string) {
  const result = {
    companyName: decodeURIComponent(companySlug).replace(/-/g, ' '),
    jobName: decodeURIComponent(jobSlug).replace(/-/g, ' '),
    date: decodeURIComponent(dateSlug),
    startTime: '',
    sequence: 1
  }

  if (shiftIdSlug) {
    const shiftId = decodeURIComponent(shiftIdSlug)
    const parts = shiftId.split('-')

    // Parse time (HHMM format)
    if (parts[0] && parts[0].length === 4) {
      const hours = parts[0].substring(0, 2)
      const minutes = parts[0].substring(2, 4)
      result.startTime = `${hours}:${minutes}`
    }

    // Parse sequence number
    if (parts[1]) {
      result.sequence = parseInt(parts[1]) || 1
    }
  }

  return result
}

/**
 * Validate if a date slug is in the correct format (YYYY-MM-DD)
 */
export function isValidDateSlug(dateSlug: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(dateSlug)) return false
  
  const date = new Date(dateSlug)
  return date instanceof Date && !isNaN(date.getTime())
}

/**
 * Format date for display in URLs and UI
 */
export function formatDateForDisplay(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Create breadcrumb data from URL parameters
 */
export function createShiftBreadcrumbs(companySlug: string, jobSlug: string, dateSlug: string, shiftIdSlug?: string) {
  const { companyName, jobName, date, startTime, sequence } = parseShiftUrl(companySlug, jobSlug, dateSlug, shiftIdSlug)

  return [
    { label: 'Shifts', href: '/shifts' },
    { label: companyName, href: `/clients` },
    { label: jobName, href: `/jobs` },
    { label: formatDateForDisplay(date), href: `/shifts` },
    { label: `${startTime}${sequence > 1 ? ` (#${sequence})` : ''}`, href: generateShiftUrl(companyName, jobName, date, startTime, sequence) }
  ]
}

/**
 * Generate a client URL using company name slug
 */
export function generateClientUrl(companyName: string): string {
  const companySlug = createSlug(companyName)
  return `/clients/${encodeURIComponent(companySlug)}`
}

/**
 * Generate edit URL for a client
 */
export function generateClientEditUrl(companyName: string): string {
  return `${generateClientUrl(companyName)}/edit`
}

/**
 * Parse client URL parameters back to readable names
 */
export function parseClientUrl(companySlug: string) {
  return {
    companyName: decodeURIComponent(companySlug).replace(/-/g, ' ')
  }
}

/**
 * Create breadcrumb data for client pages
 */
export function createClientBreadcrumbs(companySlug: string) {
  const { companyName } = parseClientUrl(companySlug)

  return [
    { label: 'Clients', href: '/clients' },
    { label: companyName, href: generateClientUrl(companyName) }
  ]
}
