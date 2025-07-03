import { format, parse } from 'date-fns';

/**
 * Convert 24-hour time string to 12-hour format with AM/PM
 * @param timeString - Time in format "HH:mm" or ISO string
 * @returns Formatted time like "9:30 AM" or "5:45 PM"
 */
export function formatTo12Hour(timeString?: string): string {
  if (!timeString) return '-';
  
  try {
    // Handle ISO datetime strings
    if (timeString.includes('T') || timeString.includes('Z')) {
      const date = new Date(timeString);
      return format(date, 'h:mm a');
    }
    
    // Handle time-only strings like "21:30"
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return format(date, 'h:mm a');
    }
    
    return timeString;
  } catch (error) {
    console.warn('Error formatting time:', timeString, error);
    return timeString;
  }
}

/**
 * Round time to nearest 15-minute increment
 * @param timeString - Time in format "HH:mm" or ISO string
 * @param direction - 'down' for clock in (round down), 'up' for clock out (round up)
 * @returns Rounded time string in same format as input
 */
export function roundToQuarterHour(timeString?: string, direction: 'up' | 'down' = 'down'): string {
  if (!timeString) return '';
  
  try {
    let date: Date;
    let isISOString = false;
    
    // Handle ISO datetime strings
    if (timeString.includes('T') || timeString.includes('Z')) {
      date = new Date(timeString);
      isISOString = true;
    } else if (timeString.includes(':')) {
      // Handle time-only strings like "21:30"
      const [hours, minutes] = timeString.split(':').map(Number);
      date = new Date();
      date.setHours(hours, minutes, 0, 0);
    } else {
      return timeString;
    }
    
    const minutes = date.getMinutes();
    const remainder = minutes % 15;
    
    let roundedMinutes: number;
    if (remainder === 0) {
      roundedMinutes = minutes; // Already on quarter hour
    } else if (direction === 'down') {
      roundedMinutes = minutes - remainder; // Round down
    } else {
      roundedMinutes = minutes + (15 - remainder); // Round up
    }
    
    // Handle hour overflow
    if (roundedMinutes >= 60) {
      date.setHours(date.getHours() + 1);
      roundedMinutes = 0;
    }
    
    date.setMinutes(roundedMinutes, 0, 0);
    
    // Return in same format as input
    if (isISOString) {
      return date.toISOString();
    } else {
      return format(date, 'HH:mm');
    }
  } catch (error) {
    console.warn('Error rounding time:', timeString, error);
    return timeString;
  }
}

/**
 * Calculate total hours between two time strings with rounding applied
 * @param clockIn - Clock in time
 * @param clockOut - Clock out time
 * @returns Total hours as number
 */
export function calculateRoundedHours(clockIn?: string, clockOut?: string): number {
  if (!clockIn || !clockOut) return 0;
  
  try {
    // Apply rounding
    const roundedClockIn = roundToQuarterHour(clockIn, 'down');
    const roundedClockOut = roundToQuarterHour(clockOut, 'up');
    
    let startDate: Date;
    let endDate: Date;
    
    // Handle different time formats
    if (roundedClockIn.includes('T') || roundedClockIn.includes('Z')) {
      startDate = new Date(roundedClockIn);
      endDate = new Date(roundedClockOut);
    } else {
      // Handle time-only strings
      const [inHours, inMinutes] = roundedClockIn.split(':').map(Number);
      const [outHours, outMinutes] = roundedClockOut.split(':').map(Number);
      
      startDate = new Date();
      startDate.setHours(inHours, inMinutes, 0, 0);
      
      endDate = new Date();
      endDate.setHours(outHours, outMinutes, 0, 0);
      
      // Handle overnight shifts
      if (endDate < startDate) {
        endDate.setDate(endDate.getDate() + 1);
      }
    }
    
    const diffMs = endDate.getTime() - startDate.getTime();
    return diffMs / (1000 * 60 * 60); // Convert to hours
  } catch (error) {
    console.warn('Error calculating rounded hours:', clockIn, clockOut, error);
    return 0;
  }
}

/**
 * Calculate total hours for multiple time entries with rounding
 * @param timeEntries - Array of time entries with clockIn and clockOut
 * @returns Total hours as formatted string
 */
export function calculateTotalRoundedHours(timeEntries: { clockIn?: string; clockOut?: string }[]): string {
  const totalHours = timeEntries.reduce((acc, entry) => {
    return acc + calculateRoundedHours(entry.clockIn, entry.clockOut);
  }, 0);
  
  return totalHours.toFixed(2);
}

/**
 * Format date to readable format
 * @param dateString - Date string
 * @returns Formatted date like "07/03/2025"
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    return format(date, 'MM/dd/yyyy');
  } catch (error) {
    console.warn('Error formatting date:', dateString, error);
    return dateString;
  }
}

/**
 * Get display values for time entry with rounding applied
 * @param clockIn - Original clock in time
 * @param clockOut - Original clock out time
 * @returns Object with original and rounded times, plus calculated hours
 */
export function getTimeEntryDisplay(clockIn?: string, clockOut?: string) {
  return {
    originalClockIn: clockIn,
    originalClockOut: clockOut,
    roundedClockIn: roundToQuarterHour(clockIn, 'down'),
    roundedClockOut: roundToQuarterHour(clockOut, 'up'),
    displayClockIn: formatTo12Hour(roundToQuarterHour(clockIn, 'down')),
    displayClockOut: formatTo12Hour(roundToQuarterHour(clockOut, 'up')),
    totalHours: calculateRoundedHours(clockIn, clockOut)
  };
}
