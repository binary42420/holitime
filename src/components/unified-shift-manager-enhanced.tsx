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
import { format, differenceInMinutes } from "date-fns"
import { useErrorHandler } from "@/lib/error-handler"

interface MutationState<T = any> {
  mutate: (variables: T) => Promise<any>
  reset: () => void
  data: any
  loading: boolean
  error: string | null
  variables?: T
}

interface ClockActionVariables {
  assignmentId: string
  action: 'clock_in' | 'clock_out'
}

interface EndShiftVariables {
  assignmentId: string
}

interface FinalizeTimesheetVariables {
  // Empty interface since no variables needed
}

// Custom hook for mutations with state tracking
const useMutation = <T,>(
  mutationFn: (variables: T) => Promise<any>,
  options?: {
    onSuccess?: (data: any, variables: T) => void
    context?: Record<string, any>
  }
): MutationState<T> => {
  const [state, setState] = useState<{
    loading: boolean
    error: string | null
    data: any
    variables?: T
  }>({
    loading: false,
    error: null,
    data: null
  })

  const mutate = async (variables: T) => {
    setState(prev => ({ ...prev, loading: true, variables }))
    try {
      const data = await mutationFn(variables)
      setState(prev => ({ ...prev, loading: false, data }))
      options?.onSuccess?.(data, variables)
      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      setState(prev => ({ ...prev, loading: false, error: errorMessage }))
      throw error
    }
  }

  const reset = () => {
    setState({ loading: false, error: null, data: null })
  }

  return {
    mutate,
    reset,
    ...state
  }
}
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
import { 
  FeedbackButton, 
  StatusIndicator, 
  ConnectionStatus, 
  OptimisticUpdate,
  AnimatedBadge,
  InstantFeedback
} from "@/components/ui/enhanced-feedback"

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

export default function UnifiedShiftManagerEnhanced({ 
  shiftId, 
  assignedPersonnel, 
  onUpdate,
  isOnline = true
}: UnifiedShiftManagerProps) {
  const { toast } = useToast()
  const { handleError, withRetry } = useErrorHandler()
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)

  // Enhanced mutations with error handling
  const clockActionMutation = useMutation(
    async ({ assignmentId, action }: { assignmentId: string; action: 'clock_in' | 'clock_out' }) => {
      const response = await fetch(`/api/shifts/${shiftId}/assigned/${assignmentId}/clock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${action.replace('_', ' ')}`)
      }
      
      return response.json()
    },
    {
      onSuccess: (data, variables) => {
        const worker = assignedPersonnel.find(w => w.id === variables.assignmentId)
        toast({
          title: variables.action === 'clock_in' ? "Clocked In" : "Clocked Out",
          description: `${worker?.employeeName} has been ${variables.action === 'clock_in' ? 'clocked in' : 'clocked out'} successfully`,
        })
        onUpdate()
        setLastUpdateTime(new Date())
      },
      context: {
        component: 'UnifiedShiftManager',
        action: 'clock_action',
        shiftId
      }
    }
  )

  const endShiftMutation = useMutation(
    async ({ assignmentId }: { assignmentId: string }) => {
      const response = await fetch(`/api/shifts/${shiftId}/assigned/${assignmentId}/end-shift`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to end shift')
      }
      
      return response.json()
    },
    {
      onSuccess: (data, variables) => {
        const worker = assignedPersonnel.find(w => w.id === variables.assignmentId)
        toast({
          title: "Shift Ended",
          description: `${worker?.employeeName}'s shift has been ended`,
        })
        onUpdate()
        setLastUpdateTime(new Date())
      },
      context: {
        component: 'UnifiedShiftManager',
        action: 'end_shift',
        shiftId
      }
    }
  )

  const endAllShiftsMutation = useMutation(
    async () => {
      const response = await fetch(`/api/shifts/${shiftId}/end-all-shifts`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to end all shifts')
      }
      
      return response.json()
    },
    {
      onSuccess: () => {
        const activeWorkers = assignedPersonnel.filter(w => 
          !['Shift Ended', 'shift_ended'].includes(w.status)
        )
        toast({
          title: "All Shifts Ended",
          description: `Successfully ended shifts for ${activeWorkers.length} workers`,
        })
        onUpdate()
        setLastUpdateTime(new Date())
      },
      context: {
        component: 'UnifiedShiftManager',
        action: 'end_all_shifts',
        shiftId
      }
    }
  )

  const finalizeTimesheetMutation = useMutation(
    async () => {
      const response = await fetch(`/api/shifts/${shiftId}/finalize-timesheet`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to finalize timesheet')
      }
      
      return response.json()
    },
    {
      onSuccess: (result) => {
        toast({
          title: "Timesheet Finalized",
          description: "Timesheet has been finalized and is pending client approval",
        })

        if (result.timesheetId) {
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
      },
      context: {
        component: 'UnifiedShiftManager',
        action: 'finalize_timesheet',
        shiftId
      }
    }
  )

  // Calculate shift statistics
  const totalWorkers = assignedPersonnel.length
  const workingCount = assignedPersonnel.filter(w => w.status === 'Clocked In').length
  const completedCount = assignedPersonnel.filter(w => ['Shift Ended', 'shift_ended'].includes(w.status)).length
  const notStartedCount = assignedPersonnel.filter(w => w.status === 'not_started').length
  const onBreakCount = assignedPersonnel.filter(w => w.status === 'Clocked Out').length
  
  // Calculate completion percentage
  const completionPercentage = totalWorkers > 0 ? (completedCount / totalWorkers) * 100 : 0

  // Check if any mutations are loading
  const isProcessing = clockActionMutation.loading || 
                     endShiftMutation.loading || 
                     endAllShiftsMutation.loading || 
                     finalizeTimesheetMutation.loading

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefreshEnabled) return

    const interval = setInterval(() => {
      if (!isProcessing && isOnline) {
        onUpdate()
        setLastUpdateTime(new Date())
      }
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [autoRefreshEnabled, isProcessing, isOnline, onUpdate])

  const handleClockAction = async (assignmentId: string, action: 'clock_in' | 'clock_out') => {
    if (!isOnline) {
      return toast({
        title: "Offline",
        description: "Cannot perform clock actions while offline. Please check your connection.",
        variant: "destructive",
      })
    }

    const worker = assignedPersonnel.find(w => w.id === assignmentId)
    if (!worker) {
      return toast({
        title: "Error",
        description: "Worker not found",
        variant: "destructive",
      })
    }

    // Show instant feedback while action is processing
    const feedbackMessage = `${action === 'clock_in' ? 'Clocking in' : 'Clocking out'} ${worker.employeeName}...`
    
    try {
      await clockActionMutation.mutate({ assignmentId, action })
    } catch (error) {
      // Error handling is already done in mutation config
      return
    }
  }

  const handleEndShift = async (assignmentId: string) => {
    if (!isOnline) {
      toast({
        title: "Offline",
        description: "Cannot end shifts while offline. Please check your connection.",
        variant: "destructive",
      })
      return
    }

    await endShiftMutation.mutate({ assignmentId })
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

    await endAllShiftsMutation.mutate()
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
        description: `${incompleteWorkers.length} workers haven't completed their shifts yet`,
        variant: "destructive",
      })
      return
    }

    await finalizeTimesheetMutation.mutate()
  }

  return (
    <ErrorBoundary context={{ component: 'UnifiedShiftManager', shiftId }}>
      <div className="space-y-6">
        {/* Connection Status */}
        <ConnectionStatus isOnline={isOnline} />

        {/* Shift Overview Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Shift Management
                </CardTitle>
                <CardDescription>
                  Manage worker clock-ins, breaks, and shift completion
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <StatusIndicator 
                  status={isProcessing ? 'loading' : 'idle'}
                  message={isProcessing ? 'Processing...' : `Last updated: ${format(lastUpdateTime, 'HH:mm:ss')}`}
                />
                <FeedbackButton
                  variant="outline"
                  size="sm"
                  onClick={onUpdate}
                  loading={isProcessing}
                  loadingText="Refreshing..."
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </FeedbackButton>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Progress Overview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Shift Progress</span>
                <span>{Math.round(completionPercentage)}% Complete</span>
              </div>
              <Progress value={completionPercentage} className="h-2" />
              
              {/* Status Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{workingCount}</div>
                  <div className="text-sm text-muted-foreground">Working</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{onBreakCount}</div>
                  <div className="text-sm text-muted-foreground">On Break</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{notStartedCount}</div>
                  <div className="text-sm text-muted-foreground">Not Started</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{completedCount}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Worker List */}
        <Card>
          <CardHeader>
            <CardTitle>Assigned Personnel</CardTitle>
            <CardDescription>
              {totalWorkers} workers assigned to this shift
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assignedPersonnel.map((worker) => {
                const statusConfig = getStatusConfig(worker.status)
                const roleConfig = roleColors[worker.roleCode as keyof typeof roleColors]
                const StatusIcon = statusConfig.icon

                return (
                  <OptimisticUpdate 
                    key={worker.id} 
                    isUpdating={clockActionMutation.loading && clockActionMutation.variables?.assignmentId === worker.id}
                  >
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={worker.employeeAvatar} alt={worker.employeeName} />
                          <AvatarFallback>
                            {worker.employeeName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{worker.employeeName}</h3>
                            <AnimatedBadge 
                              variant="outline" 
                              className={`${roleConfig?.color} ${roleConfig?.bgColor} ${roleConfig?.borderColor}`}
                            >
                              {roleConfig?.name || worker.roleOnShift}
                            </AnimatedBadge>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <AnimatedBadge 
                              className={statusConfig.color}
                              animate={worker.status === 'Clocked In' ? 'pulse' : 'none'}
                            >
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </AnimatedBadge>
                            
                            {worker.timeEntries && worker.timeEntries.length > 0 && (
                              <span className="text-sm text-muted-foreground">
                                Total: {calculateTotalHours(worker.timeEntries)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          {worker.status === 'not_started' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <FeedbackButton
                                  size="sm"
                                  onClick={() => handleClockAction(worker.id, 'clock_in')}
                                  loading={clockActionMutation.loading && clockActionMutation.variables?.assignmentId === worker.id}
                                  loadingText="Clocking In..."
                                  successText="Clocked In!"
                                  disabled={!isOnline}
                                >
                                  <Play className="h-4 w-4 mr-1" />
                                  Clock In
                                </FeedbackButton>
                              </TooltipTrigger>
                              <TooltipContent>Start this worker's shift</TooltipContent>
                            </Tooltip>
                          )}

                          {worker.status === 'Clocked In' && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <FeedbackButton
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleClockAction(worker.id, 'clock_out')}
                                    loading={clockActionMutation.loading && clockActionMutation.variables?.assignmentId === worker.id}
                                    loadingText="Taking Break..."
                                    successText="On Break!"
                                    disabled={!isOnline}
                                  >
                                    <Coffee className="h-4 w-4 mr-1" />
                                    Break
                                  </FeedbackButton>
                                </TooltipTrigger>
                                <TooltipContent>Send worker on break</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <FeedbackButton
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleEndShift(worker.id)}
                                    loading={endShiftMutation.loading && endShiftMutation.variables?.assignmentId === worker.id}
                                    loadingText="Ending Shift..."
                                    successText="Shift Ended!"
                                    disabled={!isOnline}
                                  >
                                    <StopCircle className="h-4 w-4 mr-1" />
                                    End Shift
                                  </FeedbackButton>
                                </TooltipTrigger>
                                <TooltipContent>End this worker's shift</TooltipContent>
                              </Tooltip>
                            </>
                          )}

                          {worker.status === 'Clocked Out' && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <FeedbackButton
                                    size="sm"
                                    onClick={() => handleClockAction(worker.id, 'clock_in')}
                                    loading={clockActionMutation.loading && clockActionMutation.variables?.assignmentId === worker.id}
                                    loadingText="Returning..."
                                    successText="Back to Work!"
                                    disabled={!isOnline}
                                  >
                                    <Play className="h-4 w-4 mr-1" />
                                    Return
                                  </FeedbackButton>
                                </TooltipTrigger>
                                <TooltipContent>Return from break</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <FeedbackButton
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleEndShift(worker.id)}
                                    loading={endShiftMutation.loading && endShiftMutation.variables?.assignmentId === worker.id}
                                    loadingText="Ending Shift..."
                                    successText="Shift Ended!"
                                    disabled={!isOnline}
                                  >
                                    <StopCircle className="h-4 w-4 mr-1" />
                                    End Shift
                                  </FeedbackButton>
                                </TooltipTrigger>
                                <TooltipContent>End this worker's shift</TooltipContent>
                              </Tooltip>
                            </>
                          )}

                          {(worker.status === 'Shift Ended' || worker.status === 'shift_ended') && (
                            <AnimatedBadge variant="secondary">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completed
                            </AnimatedBadge>
                          )}
                        </TooltipProvider>
                      </div>
                    </div>
                  </OptimisticUpdate>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Bulk Actions</CardTitle>
            <CardDescription>
              Perform actions on all workers at once
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <FeedbackButton
                    variant="destructive"
                    disabled={!isOnline || assignedPersonnel.filter(w => !['Shift Ended', 'shift_ended'].includes(w.status)).length === 0}
                    loading={endAllShiftsMutation.loading}
                    loadingText="Ending All Shifts..."
                  >
                    <StopCircle className="h-4 w-4 mr-2" />
                    End All Shifts
                  </FeedbackButton>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>End All Active Shifts?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will end shifts for all workers who haven't completed their shifts yet. 
                      This action cannot be undone.
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
                  <FeedbackButton
                    disabled={!isOnline || completedCount !== totalWorkers}
                    loading={finalizeTimesheetMutation.loading}
                    loadingText="Finalizing..."
                    successText="Finalized!"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Finalize Timesheet
                  </FeedbackButton>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Finalize Timesheet?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will create a final timesheet for client approval. 
                      Make sure all workers have completed their shifts.
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
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  )
}
