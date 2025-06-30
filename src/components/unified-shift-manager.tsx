"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { 
  Clock, 
  Play, 
  Square, 
  StopCircle, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  Timer,
  Coffee,
  UserCheck,
  FileText,
  Download
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useApi } from "@/hooks/use-api"
import { format, differenceInMinutes } from "date-fns"

interface TimeEntry {
  id: string;
  entryNumber: number;
  clockIn?: string;
  clockOut?: string;
  isActive: boolean;
}

interface AssignedWorker {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  roleOnShift: string;
  roleCode: string;
  status: 'Clocked Out' | 'Clocked In' | 'On Break' | 'Shift Ended' | 'shift_ended' | 'not_started';
  timeEntries: TimeEntry[];
}

interface UnifiedShiftManagerProps {
  shiftId: string;
  assignedPersonnel: AssignedWorker[];
  onUpdate: () => void;
}

const roleColors = {
  'CC': { name: 'Crew Chief', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  'SH': { name: 'Stage Hand', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  'FO': { name: 'Fork Operator', color: 'text-purple-700', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  'RFO': { name: 'Rough Fork Operator', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  'RG': { name: 'Rigger', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  'GL': { name: 'General Labor', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
} as const

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'not_started':
      return { 
        label: 'Not Started', 
        color: 'bg-gray-100 text-gray-800', 
        icon: Clock,
        description: 'Ready to clock in'
      }
    case 'Clocked In':
      return { 
        label: 'Working', 
        color: 'bg-green-100 text-green-800', 
        icon: Play,
        description: 'Currently working'
      }
    case 'Clocked Out':
      return { 
        label: 'On Break', 
        color: 'bg-yellow-100 text-yellow-800', 
        icon: Coffee,
        description: 'On break'
      }
    case 'Shift Ended':
    case 'shift_ended':
      return { 
        label: 'Completed', 
        color: 'bg-blue-100 text-blue-800', 
        icon: CheckCircle2,
        description: 'Shift completed'
      }
    default:
      return { 
        label: status, 
        color: 'bg-gray-100 text-gray-800', 
        icon: AlertCircle,
        description: 'Unknown status'
      }
  }
}

const calculateTotalHours = (timeEntries: TimeEntry[] = []) => {
  let totalMinutes = 0
  
  timeEntries.forEach(entry => {
    if (entry.clockIn && entry.clockOut) {
      const clockInTime = new Date(entry.clockIn)
      const clockOutTime = new Date(entry.clockOut)
      totalMinutes += differenceInMinutes(clockOutTime, clockInTime)
    }
  })
  
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}m`
}

export default function UnifiedShiftManager({ 
  shiftId, 
  assignedPersonnel, 
  onUpdate 
}: UnifiedShiftManagerProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)

  // Calculate shift statistics
  const totalWorkers = assignedPersonnel.length
  const workingCount = assignedPersonnel.filter(w => w.status === 'Clocked In').length
  const completedCount = assignedPersonnel.filter(w => ['Shift Ended', 'shift_ended'].includes(w.status)).length
  const notStartedCount = assignedPersonnel.filter(w => w.status === 'not_started').length

  const handleClockAction = async (assignmentId: string, action: 'clock_in' | 'clock_out') => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/shifts/${shiftId}/assigned/${assignmentId}/clock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to ${action.replace('_', ' ')}`)
      }

      const worker = assignedPersonnel.find(w => w.id === assignmentId)
      toast({
        title: action === 'clock_in' ? "Clocked In" : "Clocked Out",
        description: `${worker?.employeeName} has been ${action === 'clock_in' ? 'clocked in' : 'clocked out'} successfully`,
      })
      onUpdate()
    } catch (error) {
      console.error(`Error ${action}:`, error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${action.replace('_', ' ')}`,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEndShift = async (assignmentId: string, workerName: string) => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/shifts/${shiftId}/assigned/${assignmentId}/end-shift`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to end shift')
      }

      toast({
        title: "Shift Ended",
        description: `${workerName}'s shift has been ended`,
      })
      onUpdate()
    } catch (error) {
      console.error('Error ending shift:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to end shift",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEndAllShifts = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/shifts/${shiftId}/end-all-shifts`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to end all shifts')
      }

      toast({
        title: "All Shifts Ended",
        description: "All worker shifts have been ended successfully",
      })
      onUpdate()
    } catch (error) {
      console.error('Error ending all shifts:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to end all shifts",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFinalizeTimesheet = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/shifts/${shiftId}/finalize-timesheet`, {
        method: 'POST'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to finalize timesheet')
      }

      const result = await response.json()
      toast({
        title: "Timesheet Finalized",
        description: "Timesheet has been finalized and is pending client approval",
      })

      if (result.timesheetId) {
        window.open(`/timesheets/${result.timesheetId}/approve`, '_blank')
      }

      onUpdate()
    } catch (error) {
      console.error('Error finalizing timesheet:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to finalize timesheet",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Shift Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Shift Progress
          </CardTitle>
          <CardDescription>
            Track employee attendance and manage shift operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{totalWorkers}</div>
              <div className="text-sm text-muted-foreground">Total Workers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{workingCount}</div>
              <div className="text-sm text-muted-foreground">Currently Working</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{completedCount}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-500">{notStartedCount}</div>
              <div className="text-sm text-muted-foreground">Not Started</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Employee Time Management
          </CardTitle>
          <CardDescription>
            Manage individual employee clock in/out times and shift status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {assignedPersonnel.map((worker) => {
              const statusConfig = getStatusConfig(worker.status)
              const roleConfig = roleColors[worker.roleCode as keyof typeof roleColors] || roleColors.GL
              const StatusIcon = statusConfig.icon
              const totalHours = calculateTotalHours(worker.timeEntries)
              const currentEntry = worker.timeEntries.find(entry => entry.isActive || (!entry.clockOut && entry.clockIn))

              return (
                <div key={worker.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={worker.employeeAvatar} alt={worker.employeeName} />
                        <AvatarFallback>{worker.employeeName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{worker.employeeName}</h4>
                          <Badge className={`${roleConfig.bgColor} ${roleConfig.color} ${roleConfig.borderColor} border`}>
                            {roleConfig.name}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-1">
                          <Badge className={statusConfig.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                          
                          {totalHours !== '0h 0m' && (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Timer className="h-3 w-3" />
                              {totalHours}
                            </span>
                          )}
                          
                          {currentEntry && currentEntry.clockIn && !currentEntry.clockOut && (
                            <span className="text-sm text-green-600 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Started at {format(new Date(currentEntry.clockIn), 'HH:mm')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {worker.timeEntries.map((entry, index) => (
                        <div key={index} className="text-xs text-muted-foreground">
                          {entry.clockIn ? format(new Date(entry.clockIn), 'HH:mm') : '--:--'} - {entry.clockOut ? format(new Date(entry.clockOut), 'HH:mm') : '--:--'}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      {worker.status === 'not_started' && (
                        <Button
                          size="sm"
                          onClick={() => handleClockAction(worker.id, 'clock_in')}
                          disabled={isProcessing}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Clock In
                        </Button>
                      )}
                      
                      import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// ... (rest of the component)

                      {worker.status === 'Clocked In' && (
                        <>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleClockAction(worker.id, 'clock_out')}
                                  disabled={isProcessing}
                                >
                                  <Square className="h-3 w-3 mr-1" />
                                  Clock Out
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Clock out for a break.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleEndShift(worker.id, worker.employeeName)}
                                  disabled={isProcessing}
                                >
                                  <StopCircle className="h-3 w-3 mr-1" />
                                  End Shift
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>End the shift for this worker.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      )}
                      
                      {worker.status === 'Clocked Out' && (
                        <>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  onClick={() => handleClockAction(worker.id, 'clock_in')}
                                  disabled={isProcessing}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  Clock In
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Clock in to start working.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleEndShift(worker.id, worker.employeeName)}
                                  disabled={isProcessing}
                                >
                                  <StopCircle className="h-3 w-3 mr-1" />
                                  End Shift
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>End the shift for this worker.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      )}
                      
                      {['Shift Ended', 'shift_ended'].includes(worker.status) && (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Complete
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Shift Management
          </CardTitle>
          <CardDescription>
            Bulk operations and timesheet finalization
          </CardDescription>
        </CardHeader>
        <CardContent>
          import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// ... (rest of the component)

          <div className="flex flex-wrap gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isProcessing || completedCount === totalWorkers}
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  End All Shifts
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will end the shift for all workers who have not yet completed their shift. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEndAllShifts}>
                    End All Shifts
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={isProcessing || completedCount < totalWorkers}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Finalize Timesheet
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will finalize the timesheet and send it for client approval. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleFinalizeTimesheet}>
                    Finalize Timesheet
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            {completedCount === totalWorkers && (
              <Badge className="bg-green-100 text-green-800 px-3 py-1">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                All workers completed
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
