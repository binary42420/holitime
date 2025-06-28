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
  if (!startTime || startTime.trim() === '' || startTime === 'undefined') {
    // Return a default identifier instead of throwing during build
    console.warn(`Invalid startTime for createShiftIdentifier: "${startTime}", using default`)
    return sequence ? `0000-${sequence}` : '0000'
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
    // First decode the URL component
    const decodedShiftId = decodeURIComponent(shiftIdSlug)
    
    // Handle different time formats:
    // 1. "2100:00-1" (with colon)
    // 2. "2100-1" (without colon, HHMM format)
    // 3. "21:00-1" (already formatted)
    
    let timeStr = ''
    let sequenceStr = ''
    
    // Check if it contains a colon (already formatted time)
    if (decodedShiftId.includes(':')) {
      const parts = decodedShiftId.split('-')
      let rawTime = parts[0] // e.g., "21:00" or "1000:00"
      sequenceStr = parts[1] || '1'

      // Handle malformed times like "1000:00" -> "10:00"
      if (rawTime.length > 5) {
        // Extract just the time part before the colon
        const timePart = rawTime.split(':')[0]
        if (timePart.length === 4) {
          // HHMM format like "1000"
          const hours = timePart.substring(0, 2)
          const minutes = timePart.substring(2, 4)
          timeStr = `${hours}:${minutes}`
        } else {
          timeStr = rawTime
        }
      } else {
        timeStr = rawTime
      }
    } else {
      // Split by dash to separate time and sequence
      const parts = decodedShiftId.split('-')
      const timePart = parts[0]
      sequenceStr = parts[1] || '1'
      
      // Parse time based on length
      if (timePart.length === 4) {
        // HHMM format (e.g., "2100")
        const hours = timePart.substring(0, 2)
        const minutes = timePart.substring(2, 4)
        timeStr = `${hours}:${minutes}`
      } else if (timePart.length === 3) {
        // HMM format (e.g., "900" for 9:00)
        const hours = timePart.substring(0, 1)
        const minutes = timePart.substring(1, 3)
        timeStr = `${hours.padStart(2, '0')}:${minutes}`
      } else {
        // Assume it's already formatted or invalid
        timeStr = timePart
      }
    }
    
    result.startTime = timeStr
    result.sequence = parseInt(sequenceStr) || 1
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
    {
      label: `${startTime}${sequence > 1 ? ` (#${sequence})` : ''}`,
      href: startTime ? generateShiftUrl(companyName, jobName, date, startTime, sequence) : '/shifts'
    }
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
