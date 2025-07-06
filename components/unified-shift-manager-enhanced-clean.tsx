"use client"
import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/(app)/components/ui/card"
import { Button } from "@/app/(app)/components/ui/button"
import { Badge } from "@/app/(app)/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/app/(app)/components/ui/avatar"
import { Separator } from "@/app/(app)/components/ui/separator"
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
  Shield,
  UserX
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useApi, useMutation } from "@/hooks/use-api"
import { format, differenceInMinutes } from "date-fns"
import { useCrewChiefPermissions } from "@/hooks/useCrewChiefPermissions"
import { CrewChiefPermissionBadge, PermissionGuard } from "@/app/(app)/components/crew-chief-permission-badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/(app)/components/ui/tooltip"
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
} from "@/app/(app)/components/ui/alert-dialog"
import { Progress } from "@/app/(app)/components/ui/progress"
import { LoadingSpinner, InlineLoading } from "@/app/(app)/components/loading-states"
import { useErrorHandler, type ErrorContext } from "@/lib/error-handler"
import { ErrorBoundary } from "@/app/(app)/components/error-boundary"

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
  status: "Clocked Out" | "Clocked In" | "On Break" | "Shift Ended" | "shift_ended" | "not_started";
  timeEntries: TimeEntry[];
}

interface UnifiedShiftManagerProps {
  shiftId: string;
  assignedPersonnel: AssignedWorker[];
  onUpdate: () => void;
  isOnline?: boolean;
  shift?: any; // Add shift data for accessing start time and date
}

interface ActionState {
  isProcessing: boolean;
  lastAction?: string;
  retryCount: number;
}

interface StatusIndicatorProps {
  status: "loading" | "idle";
  message?: string;
}

const StatusIndicator = ({ status, message }: StatusIndicatorProps) => (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    {status === "loading" ? (
      <RefreshCw className="h-4 w-4 animate-spin" />
    ) : (
      <Timer className="h-4 w-4" />
    )}
    <span>{message}</span>
  </div>
)

const roleColors = {
  "CC": { name: "Crew Chief", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  "SH": { name: "Stage Hand", color: "text-green-700", bgColor: "bg-green-50", borderColor: "border-green-200" },
  "FO": { name: "Fork Operator", color: "text-purple-700", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
  "RFO": { name: "Rough Fork Operator", color: "text-orange-700", bgColor: "bg-orange-50", borderColor: "border-orange-200" },
  "RG": { name: "Rigger", color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-200" },
  "GL": { name: "General Labor", color: "text-gray-700", bgColor: "bg-gray-50", borderColor: "border-gray-200" },
} as const

const getStatusConfig = (status: string) => {
  switch (status) {
  case "not_started":
    return {
      label: "Not Started",
      color: "bg-gray-100 text-gray-800",
      icon: Clock,
      description: "Ready to clock in"
    }
  case "Clocked In":
    return {
      label: "Working",
      color: "bg-green-100 text-green-800",
      icon: Play,
      description: "Currently working"
    }
  case "Clocked Out":
    return {
      label: "On Break",
      color: "bg-yellow-100 text-yellow-800",
      icon: Coffee,
      description: "On break"
    }
  case "Shift Ended":
  case "shift_ended":
    return {
      label: "Completed",
      color: "bg-blue-100 text-blue-800",
      icon: CheckCircle2,
      description: "Shift completed"
    }
  case "no_show":
    return {
      label: "No Show",
      color: "bg-red-100 text-red-800",
      icon: UserX,
      description: "Did not show up for shift"
    }
  default:
    return {
      label: status,
      color: "bg-gray-100 text-gray-800",
      icon: AlertCircle,
      description: "Unknown status"
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

// Helper function to format time in 12-hour format with AM/PM
const formatTime12Hour = (timeString: string | undefined): string => {
  if (!timeString) return ""
  try {
    return format(new Date(timeString), "h:mm a")
  } catch {
    return ""
  }
}

// Helper function to check if \"No Show\" button should be enabled
const canMarkNoShow = (shiftStartTime: string, shiftDate: string): boolean => {
  try {
    const shiftDateTime = new Date(`${shiftDate}T${shiftStartTime}`)
    const now = new Date()
    const minutesSinceStart = differenceInMinutes(now, shiftDateTime)
    return minutesSinceStart >= 30 // Enable after 30 minutes
  } catch {
    return false
  }
}

export default function UnifiedShiftManager({
  shiftId,
  assignedPersonnel,
  onUpdate,
  isOnline = true,
  shift
}: UnifiedShiftManagerProps) {
  const { hasPermission, permissionCheck, isLoading: permissionLoading } = useCrewChiefPermissions(shiftId)
  const { toast } = useToast()
  const [actionState, setActionState] = useState<ActionState>({
    isProcessing: false,
    retryCount: 0
  })
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const [timesheetStatus, setTimesheetStatus] = useState<string | null>(null)
  const [timesheetId, setTimesheetId] = useState<string | null>(null)

  // Calculate shift statistics
  const totalWorkers = assignedPersonnel.length
  const workingCount = assignedPersonnel.filter(w => w.status === "Clocked In").length
  const completedCount = assignedPersonnel.filter(w => ["Shift Ended", "shift_ended"].includes(w.status)).length
  const notStartedCount = assignedPersonnel.filter(w => w.status === "not_started").length
  const onBreakCount = assignedPersonnel.filter(w => w.status === "Clocked Out").length

  // Calculate completion percentage
  const completionPercentage = totalWorkers > 0 ? (completedCount / totalWorkers) * 100 : 0

  // Fetch timesheet status
  const fetchTimesheetStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/timesheets?shiftId=${shiftId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.timesheets && data.timesheets.length > 0) {
          const timesheet = data.timesheets[0]
          setTimesheetStatus(timesheet.status)
          setTimesheetId(timesheet.id)
        } else {
          setTimesheetStatus(null)
          setTimesheetId(null)
        }
      }
    } catch (error) {
      console.warn("Failed to fetch timesheet status:", error)
    }
  }, [shiftId])

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefreshEnabled) return

    const interval = setInterval(() => {
      if (!actionState.isProcessing && isOnline) {
        onUpdate()
        setLastUpdateTime(new Date())
        fetchTimesheetStatus()
      }
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [autoRefreshEnabled, actionState.isProcessing, isOnline, onUpdate, fetchTimesheetStatus])

  // Fetch timesheet status on component mount and when shift updates
  useEffect(() => {
    fetchTimesheetStatus()
  }, [fetchTimesheetStatus, assignedPersonnel])

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

        // If it\'s a client error (4xx), don\'t retry
        if (response.status >= 400 && response.status < 500) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Request failed with status ${response.status}`)
        }

        // For server errors (5xx), retry
        throw new Error(`Server error: ${response.status}`)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error")

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt))
          continue
        }
      }
    }

    throw lastError || new Error("Operation failed after retries")
  }, [])

  const handleClockAction = async (assignmentId: string, action: "clock_in" | "clock_out") => {
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
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action })
        })
      })

      toast({
        title: action === "clock_in" ? "Clocked In" : "Clocked Out",
        description: `${worker.employeeName} has been ${action === "clock_in" ? "clocked in" : "clocked out"} successfully`,
      })

      // Immediate update after successful action
      onUpdate()
      setLastUpdateTime(new Date())

    } catch (error) {
      console.error(`Error ${action}:`, error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${action.replace("_", " ")}`,
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
          method: "POST"
        })
      })

      toast({
        title: "Shift Ended",
        description: `${workerName}'s shift has been ended`,
      })

      onUpdate()
      setLastUpdateTime(new Date())

    } catch (error) {
      console.error("Error ending shift:", error)
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
      !["Shift Ended", "shift_ended"].includes(w.status)
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
      lastAction: "end_all_shifts"
    }))

    try {
      await executeWithRetry(async () => {
        return fetch(`/api/shifts/${shiftId}/end-all-shifts`, {
          method: "POST"
        })
      })

      toast({
        title: "All Shifts Ended",
        description: `Successfully ended shifts for ${activeWorkers.length} workers`,
      })

      onUpdate()
      setLastUpdateTime(new Date())

    } catch (error) {
      console.error("Error ending all shifts:", error)
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

  const handleNoShow = async (workerId: string, workerName: string) => {
    if (!isOnline) {
      toast({
        title: "Offline",
        description: "Cannot mark no-show while offline. Please check your connection.",
        variant: "destructive",
      })
      return
    }

    setActionState(prev => ({
      ...prev,
      isProcessing: true,
      lastAction: `no_show_${workerId}`
    }))

    try {
      await executeWithRetry(async () => {
        return fetch(`/api/shifts/${shiftId}/no-show`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workerId }),
        })
      })

      toast({
        title: "No Show Marked",
        description: `${workerName} has been marked as no-show`,
      })

      onUpdate()
      setLastUpdateTime(new Date())

    } catch (error) {
      console.error("Error marking no-show:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to mark no-show",
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
      !["Shift Ended", "shift_ended"].includes(w.status)
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
      lastAction: "finalize_timesheet"
    }))

    try {
      const response = await executeWithRetry(async () => {
        return fetch(`/api/shifts/${shiftId}/finalize-timesheet-simple`, {
          method: "POST"
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
          window.open(`/timesheets/${result.timesheetId}/approve`, "_blank")
        } catch (popupError) {
          console.warn("Popup blocked, showing link instead")
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
      console.error("Error finalizing timesheet:", error)
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

  // Connection status component
  const ConnectionStatus = ({ isOnline }: { isOnline: boolean }) => (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${isOnline ? 'bg-green-50' : 'bg-red-50'}`}>
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-600">Online - All features available</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-600">Offline - Limited functionality</span>
        </>
      )}
    </div>
  )

  return (
    <ErrorBoundary context={{ component: "UnifiedShiftManager", shiftId }}>
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
                  status={actionState.isProcessing ? "loading" : "idle"}
                  message={actionState.isProcessing ? "Processing..." : `Last updated: ${format(lastUpdateTime, "HH:mm:ss")}`}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualRefresh}
                  disabled={actionState.isProcessing}
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
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
                const roleConfig = roleColors[worker.roleCode as keyof typeof roleColors] || roleColors.GL
                const noShowEnabled = shift ? canMarkNoShow(shift.startTime, shift.date) : false

                // Get time entries for each pair (up to 3)
                const timeEntry1 = worker.timeEntries.find(e => e.entryNumber === 1)
                const timeEntry2 = worker.timeEntries.find(e => e.entryNumber === 2)
                const timeEntry3 = worker.timeEntries.find(e => e.entryNumber === 3)

                return (
                  <div key={worker.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={worker.employeeAvatar} alt={worker.employeeName} />
                        <AvatarFallback>
                          {worker.employeeName.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{worker.employeeName}</h3>
                          <Badge 
                            variant="outline" 
                            className={`${roleConfig.color} ${roleConfig.bgColor} ${roleConfig.borderColor}`}
                          >
                            {roleConfig.name}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge 
                            className={statusConfig.color}
                          >
                            <statusConfig.icon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                          
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
                        {worker.status === "not_started" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                onClick={() => handleClockAction(worker.id, "clock_in")}
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
                            <TooltipContent>Start this worker\'s shift</TooltipContent>
                          </Tooltip>
                        )}

                        {worker.status === "Clocked In" && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleClockAction(worker.id, "clock_out")}
                                  disabled={actionState.isProcessing || !isOnline}
                                >
                                  {actionState.lastAction === `clock_out_${worker.id}` ? (
                                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  ) : (
                                    <Coffee className="h-3 w-3 mr-1" />
                                  )}
                                  Break
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Send worker on break</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
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
                              <TooltipContent>End this worker\'s shift</TooltipContent>
                            </Tooltip>
                          </>
                        )}

                        {worker.status === "Clocked Out" && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  onClick={() => handleClockAction(worker.id, "clock_in")}
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
                              <TooltipContent>Return from break</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
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
                              <TooltipContent>End this worker\'s shift</TooltipContent>
                            </Tooltip>
                          </>
                        )}

                        {(worker.status === "Shift Ended" || worker.status === "shift_ended") && (
                          <Badge variant="secondary">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                      </TooltipProvider>
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
            <CardTitle>Bulk Actions</CardTitle>
            <CardDescription>
              Perform actions on all workers at once
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={actionState.isProcessing || completedCount === totalWorkers || !isOnline}
                  >
                    <StopCircle className="h-4 w-4 mr-2" />
                    End All Shifts
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will end the shift for all workers who haven\'t completed their shifts yet. This action cannot be undone.
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
                    disabled={actionState.isProcessing || completedCount !== totalWorkers || !isOnline}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Finalize Timesheet
                  </Button>
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