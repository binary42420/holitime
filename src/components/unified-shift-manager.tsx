"use client"

import React, { useState, useEffect, useCallback } from 'react'
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
  Download,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
  Shield
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useApi, useMutation } from "@/hooks/use-api"
import { format, differenceInMinutes } from "date-fns"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
import { Progress } from "@/components/ui/progress"
import { LoadingSpinner, InlineLoading } from "@/components/loading-states"
import { useErrorHandler, type ErrorContext } from "@/lib/error-handler"
import { ErrorBoundary } from "@/components/error-boundary"

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
  isOnline?: boolean;
}

interface ActionState {
  isProcessing: boolean;
  lastAction?: string;
  retryCount: number;
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
  onUpdate,
  isOnline = true
}: UnifiedShiftManagerProps) {
  const { toast } = useToast()
  const [actionState, setActionState] = useState<ActionState>({
    isProcessing: false,
    retryCount: 0
  })
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)

  // Calculate shift statistics
  const totalWorkers = assignedPersonnel.length
  const workingCount = assignedPersonnel.filter(w => w.status === 'Clocked In').length
  const completedCount = assignedPersonnel.filter(w => ['Shift Ended', 'shift_ended'].includes(w.status)).length
  const notStartedCount = assignedPersonnel.filter(w => w.status === 'not_started').length
  const onBreakCount = assignedPersonnel.filter(w => w.status === 'Clocked Out').length

  // Calculate completion percentage
  const completionPercentage = totalWorkers > 0 ? (completedCount / totalWorkers) * 100 : 0

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefreshEnabled) return

    const interval = setInterval(() => {
      if (!actionState.isProcessing && isOnline) {
        onUpdate()
        setLastUpdateTime(new Date())
      }
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [autoRefreshEnabled, actionState.isProcessing, isOnline, onUpdate])

  // Enhanced error handling with retry logic
  const executeWithRetry = useCallback(async (
    operation: () => Promise<Response>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<Response> => {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await operation()
        if (response.ok) {
          return response
        }

        // If it's a client error (4xx), don't retry
        if (response.status >= 400 && response.status < 500) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Request failed with status ${response.status}`)
        }

        // For server errors (5xx), retry
        throw new Error(`Server error: ${response.status}`)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt))
          continue
        }
      }
    }

    throw lastError || new Error('Operation failed after retries')
  }, [])

  const handleClockAction = async (assignmentId: string, action: 'clock_in' | 'clock_out') => {
    if (!isOnline) {
      toast({
        title: "Offline",
        description: "Cannot perform clock actions while offline. Please check your connection.",
        variant: "destructive",
      })
      return
    }

    const worker = assignedPersonnel.find(w => w.id === assignmentId)
    if (!worker) {
      toast({
        title: "Error",
        description: "Worker not found",
        variant: "destructive",
      })
      return
    }

    setActionState(prev => ({
      ...prev,
      isProcessing: true,
      lastAction: `${action}_${assignmentId}`
    }))

    try {
      await executeWithRetry(async () => {
        return fetch(`/api/shifts/${shiftId}/assigned/${assignmentId}/clock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action })
        })
      })

      toast({
        title: action === 'clock_in' ? "Clocked In" : "Clocked Out",
        description: `${worker.employeeName} has been ${action === 'clock_in' ? 'clocked in' : 'clocked out'} successfully`,
      })

      // Immediate update after successful action
      onUpdate()
      setLastUpdateTime(new Date())

    } catch (error) {
      console.error(`Error ${action}:`, error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${action.replace('_', ' ')}`,
        variant: "destructive",
      })
    } finally {
      setActionState(prev => ({
        ...prev,
        isProcessing: false,
        lastAction: undefined
      }))
    }
  }

  const handleEndShift = async (assignmentId: string, workerName: string) => {
    if (!isOnline) {
      toast({
        title: "Offline",
        description: "Cannot end shifts while offline. Please check your connection.",
        variant: "destructive",
      })
      return
    }

    setActionState(prev => ({
      ...prev,
      isProcessing: true,
      lastAction: `end_shift_${assignmentId}`
    }))

    try {
      await executeWithRetry(async () => {
        return fetch(`/api/shifts/${shiftId}/assigned/${assignmentId}/end-shift`, {
          method: 'POST'
        })
      })

      toast({
        title: "Shift Ended",
        description: `${workerName}'s shift has been ended`,
      })

      onUpdate()
      setLastUpdateTime(new Date())

    } catch (error) {
      console.error('Error ending shift:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to end shift",
        variant: "destructive",
      })
    } finally {
      setActionState(prev => ({
        ...prev,
        isProcessing: false,
        lastAction: undefined
      }))
    }
  }

  const handleEndAllShifts = async () => {
    if (!isOnline) {
      toast({
        title: "Offline",
        description: "Cannot end all shifts while offline. Please check your connection.",
        variant: "destructive",
      })
      return
    }

    const activeWorkers = assignedPersonnel.filter(w =>
      !['Shift Ended', 'shift_ended'].includes(w.status)
    )

    if (activeWorkers.length === 0) {
      toast({
        title: "No Active Workers",
        description: "All workers have already ended their shifts",
      })
      return
    }

    setActionState(prev => ({
      ...prev,
      isProcessing: true,
      lastAction: 'end_all_shifts'
    }))

    try {
      await executeWithRetry(async () => {
        return fetch(`/api/shifts/${shiftId}/end-all-shifts`, {
          method: 'POST'
        })
      })

      toast({
        title: "All Shifts Ended",
        description: `Successfully ended shifts for ${activeWorkers.length} workers`,
      })

      onUpdate()
      setLastUpdateTime(new Date())

    } catch (error) {
      console.error('Error ending all shifts:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to end all shifts",
        variant: "destructive",
      })
    } finally {
      setActionState(prev => ({
        ...prev,
        isProcessing: false,
        lastAction: undefined
      }))
    }
  }

  const handleFinalizeTimesheet = async () => {
    if (!isOnline) {
      toast({
        title: "Offline",
        description: "Cannot finalize timesheet while offline. Please check your connection.",
        variant: "destructive",
      })
      return
    }

    const incompleteWorkers = assignedPersonnel.filter(w =>
      !['Shift Ended', 'shift_ended'].includes(w.status)
    )

    if (incompleteWorkers.length > 0) {
      toast({
        title: "Cannot Finalize",
        description: `${incompleteWorkers.length} workers have not completed their shifts yet`,
        variant: "destructive",
      })
      return
    }

    setActionState(prev => ({
      ...prev,
      isProcessing: true,
      lastAction: 'finalize_timesheet'
    }))

    try {
      const response = await executeWithRetry(async () => {
        return fetch(`/api/shifts/${shiftId}/finalize-timesheet`, {
          method: 'POST'
        })
      })

      const result = await response.json()
      toast({
        title: "Timesheet Finalized",
        description: "Timesheet has been finalized and is pending client approval",
      })

      if (result.timesheetId) {
        // Open in new tab with error handling
        try {
          window.open(`/timesheets/${result.timesheetId}/approve`, '_blank')
        } catch (popupError) {
          console.warn('Popup blocked, showing link instead')
          toast({
            title: "Timesheet Ready",
            description: "Click here to view the timesheet approval page",
            action: (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = `/timesheets/${result.timesheetId}/approve`}
              >
                View Timesheet
              </Button>
            ),
          })
        }
      }

      onUpdate()
      setLastUpdateTime(new Date())

    } catch (error) {
      console.error('Error finalizing timesheet:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to finalize timesheet",
        variant: "destructive",
      })
    } finally {
      setActionState(prev => ({
        ...prev,
        isProcessing: false,
        lastAction: undefined
      }))
    }
  }

  const handleManualRefresh = useCallback(() => {
    if (!actionState.isProcessing) {
      onUpdate()
      setLastUpdateTime(new Date())
      toast({
        title: "Refreshed",
        description: "Shift data has been updated",
      })
    }
  }, [actionState.isProcessing, onUpdate, toast])

  return (
    <div className="space-y-6">
      {/* Shift Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Shift Progress
              {!isOnline && <WifiOff className="h-4 w-4 text-red-500" />}
              {isOnline && <Wifi className="h-4 w-4 text-green-500" />}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualRefresh}
                disabled={actionState.isProcessing}
              >
                <RefreshCw className={`h-4 w-4 ${actionState.isProcessing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                className={autoRefreshEnabled ? 'text-green-600' : 'text-gray-400'}
              >
                <Timer className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Track employee attendance and manage shift operations
            <div className="text-xs text-muted-foreground mt-1">
              Last updated: {format(lastUpdateTime, 'HH:mm:ss')}
              {autoRefreshEnabled && ' • Auto-refresh enabled'}
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Shift Completion</span>
                <span>{Math.round(completionPercentage)}%</span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{totalWorkers}</div>
                <div className="text-sm text-muted-foreground">Total Workers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{workingCount}</div>
                <div className="text-sm text-muted-foreground">Working</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{onBreakCount}</div>
                <div className="text-sm text-muted-foreground">On Break</div>
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
                          disabled={actionState.isProcessing || !isOnline}
                          className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          {actionState.lastAction === `clock_in_${worker.id}` ? (
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3 mr-1" />
                          )}
                          Clock In
                        </Button>
                      )}

                      {worker.status === 'Clocked In' && (
                        <>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleClockAction(worker.id, 'clock_out')}
                                  disabled={actionState.isProcessing || !isOnline}
                                >
                                  {actionState.lastAction === `clock_out_${worker.id}` ? (
                                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <Square className="h-3 w-3 mr-1" />
                                  )}
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
                                  disabled={actionState.isProcessing || !isOnline}
                                >
                                  {actionState.lastAction === `end_shift_${worker.id}` ? (
                                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <StopCircle className="h-3 w-3 mr-1" />
                                  )}
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
                                  variant="outline"
                                  onClick={() => handleClockAction(worker.id, 'clock_in')}
                                  disabled={actionState.isProcessing || !isOnline}
                                >
                                  {actionState.lastAction === `clock_in_${worker.id}` ? (
                                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <Play className="h-3 w-3 mr-1" />
                                  )}
                                  Clock In
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Clock back in from break.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
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
          <div className="flex flex-wrap gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={actionState.isProcessing || completedCount === totalWorkers}
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
                  disabled={actionState.isProcessing || completedCount < totalWorkers}
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
