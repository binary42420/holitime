import { format, differenceInMinutes } from 'date-fns';

export function formatTimeTo12Hour(timeString: string) {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const minute = parseInt(minutes, 10);

  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 || 12;
  const formattedMinute = minute < 10 ? `0${minute}` : minute;

  return `${formattedHour}:${formattedMinute} ${ampm}`;
}

export function formatDate(dateString?: string | Date): string {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return format(date, 'MM/dd/yyyy');
    } catch (error) {
        console.error("Invalid date:", dateString);
        return 'Invalid Date';
    }
}

export function roundTime(time: Date, direction: 'up' | 'down'): Date {
    const minutes = time.getMinutes();
    const roundedMinutes = direction === 'up'
        ? Math.ceil(minutes / 15) * 15
        : Math.floor(minutes / 15) * 15;

    const newTime = new Date(time);
    newTime.setMinutes(roundedMinutes);
    newTime.setSeconds(0);
    newTime.setMilliseconds(0);

    if (roundedMinutes === 60) {
        newTime.setHours(newTime.getHours() + 1);
        newTime.setMinutes(0);
    }

    return newTime;
}

export function calculateTotalRoundedHours(timeEntries: { clockIn?: string; clockOut?: string }[]): string {
    if (!timeEntries || timeEntries.length === 0) {
        return '0.00';
    }

    const totalMinutes = timeEntries.reduce((acc, entry) => {
        if (entry.clockIn && entry.clockOut) {
            const clockInTime = new Date(`1970-01-01T${entry.clockIn}`);
            const clockOutTime = new Date(`1970-01-01T${entry.clockOut}`);
            
            if (!isNaN(clockInTime.getTime()) && !isNaN(clockOutTime.getTime())) {
                const roundedClockIn = roundTime(clockInTime, 'down');
                const roundedClockOut = roundTime(clockOutTime, 'up');
                return acc + differenceInMinutes(roundedClockOut, roundedClockIn);
            }
        }
        return acc;
    }, 0);

    const totalHours = totalMinutes / 60;
    return totalHours.toFixed(2);
}

export function getTimeEntryDisplay(clockIn?: string, clockOut?: string) {
    const displayClockIn = clockIn ? formatTimeTo12Hour(clockIn) : 'Not Clocked In';
    const displayClockOut = clockOut ? formatTimeTo12Hour(clockOut) : 'Not Clocked Out';
    
    let totalHours = 0;
    if (clockIn && clockOut) {
        const clockInTime = new Date(`1970-01-01T${clockIn}`);
        const clockOutTime = new Date(`1970-01-01T${clockOut}`);
        if (!isNaN(clockInTime.getTime()) && !isNaN(clockOutTime.getTime())) {
            totalHours = differenceInMinutes(clockOutTime, clockInTime) / 60;
        }
    }

    return {
        displayClockIn,
        displayClockOut,
        totalHours,
    };
}
