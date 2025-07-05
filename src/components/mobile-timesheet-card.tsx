'use client';

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock, User } from "lucide-react"
import { getTimeEntryDisplay, calculateTotalRoundedHours } from "@/lib/time-utils"

interface TimeEntry {
  id: string
  entryNumber: number
  clockIn?: string
  clockOut?: string
}

interface Worker {
  id: string
  employeeName: string
  employeeAvatar: string
  roleCode: string
  timeEntries: TimeEntry[]
}

interface MobileTimesheetCardProps {
  worker: Worker
  className?: string
}

export const MobileTimesheetCard: React.FC<MobileTimesheetCardProps> = ({ 
  worker, 
  className = "" 
}) => {
  // Calculate total hours for the worker
  const totalHours = calculateTotalRoundedHours(worker.timeEntries.map(entry => ({
    clockIn: entry.clockIn,
    clockOut: entry.clockOut
  })))

  // Filter out empty time entries
  const validEntries = worker.timeEntries.filter(entry => entry.clockIn && entry.clockOut)

  return (
    <Card className={`p-4 ${className}`}>
      {/* Worker Header */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={worker.employeeAvatar} alt={worker.employeeName} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {worker.employeeName.split(" ").map(n => n[0]).join("")}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-semibold text-base">{worker.employeeName}</h3>
          <Badge variant="outline" className="text-xs mt-1">
            {worker.roleCode}
          </Badge>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="font-bold text-lg text-primary">{totalHours}</div>
        </div>
      </div>

      {/* Time Entries */}
      {validEntries.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Clock className="h-4 w-4" />
            Time Entries
          </div>
          
          {validEntries.map((entry) => {
            const display = getTimeEntryDisplay(entry.clockIn, entry.clockOut)
            
            return (
              <div 
                key={entry.id} 
                className="flex justify-between items-center py-3 px-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold">
                    {entry.entryNumber}
                  </div>
                  <span className="text-sm font-medium">Entry {entry.entryNumber}</span>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {display.displayClockIn} - {display.displayClockOut}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {display.totalHours.toFixed(2)} hours
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <div className="text-center">
            <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No time entries recorded</p>
          </div>
        </div>
      )}
    </Card>
  )
}

interface MobileTimeEntryDisplayProps {
  assignedPersonnel: Worker[]
  className?: string
}

export const MobileTimeEntryDisplay: React.FC<MobileTimeEntryDisplayProps> = ({ 
  assignedPersonnel, 
  className = "" 
}) => {
  if (!assignedPersonnel || assignedPersonnel.length === 0) {
    return (
      <Card className={`p-8 text-center ${className}`}>
        <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="font-medium text-lg mb-2">No Personnel Assigned</h3>
        <p className="text-muted-foreground">
          No workers have been assigned to this shift yet.
        </p>
      </Card>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {assignedPersonnel.map((worker) => (
        <MobileTimesheetCard key={worker.id} worker={worker} />
      ))}
    </div>
  )
}

// Export both components
export default MobileTimesheetCard
