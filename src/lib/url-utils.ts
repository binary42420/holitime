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
 * Generate a complete shift URL using company name, job name, and date
 */
export function generateShiftUrl(companyName: string, jobName: string, date: string | Date): string {
  const companySlug = createSlug(companyName)
  const jobSlug = createSlug(jobName)
  const dateSlug = createDateSlug(date)
  
  return `/shifts/${encodeURIComponent(companySlug)}/${encodeURIComponent(jobSlug)}/${encodeURIComponent(dateSlug)}`
}

/**
 * Generate edit URL for a shift
 */
export function generateShiftEditUrl(companyName: string, jobName: string, date: string | Date): string {
  return `${generateShiftUrl(companyName, jobName, date)}/edit`
}

/**
 * Parse URL parameters back to readable names
 */
export function parseShiftUrl(companySlug: string, jobSlug: string, dateSlug: string) {
  return {
    companyName: decodeURIComponent(companySlug).replace(/-/g, ' '),
    jobName: decodeURIComponent(jobSlug).replace(/-/g, ' '),
    date: decodeURIComponent(dateSlug)
  }
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
export function createShiftBreadcrumbs(companySlug: string, jobSlug: string, dateSlug: string) {
  const { companyName, jobName, date } = parseShiftUrl(companySlug, jobSlug, dateSlug)
  
  return [
    { label: 'Shifts', href: '/shifts' },
    { label: companyName, href: `/clients` },
    { label: jobName, href: `/jobs` },
    { label: formatDateForDisplay(date), href: generateShiftUrl(companyName, jobName, date) }
  ]
}
