'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { 
  Play, 
  Square, 
  StopCircle, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimeEntry {
  id: string
  entryNumber: number
  clockIn?: string
  clockOut?: string
}

interface Worker {
  id: string
  employeeName: string
  employeeAvatar?: string
  status: string
  roleOnShift: string
  timeEntries: TimeEntry[]
}

interface MobileWorkerTimeCardProps {
  worker: Worker
  onClockIn: (workerId: string) => Promise<void>
  onClockOut: (workerId: string) => Promise<void>
  onEndShift: (workerId: string, workerName: string) => Promise<void>
  onNoShow: (workerId: string, workerName: string) => Promise<void>
  loading?: boolean
  className?: string
}

export const MobileWorkerTimeCard: React.FC<MobileWorkerTimeCardProps> = ({
  worker,
  onClockIn,
  onClockOut,
  onEndShift,
  onNoShow,
  loading = false,
  className = ""
}) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleAction = async (action: string, fn: () => Promise<void>) => {
    setActionLoading(action)
    try {
      await fn()
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status.toLowerCase()) {
      case 'not_started':
        return { 
          label: 'Not Started', 
          color: 'bg-gray-100 text-gray-800',
          icon: Clock
        }
      case 'clocked in':
        return { 
          label: 'Working', 
          color: 'bg-green-100 text-green-800',
          icon: Play
        }
      case 'clocked out':
        return { 
          label: 'On Break', 
          color: 'bg-yellow-100 text-yellow-800',
          icon: Square
        }
      case 'shift ended':
        return { 
          label: 'Finished', 
          color: 'bg-blue-100 text-blue-800',
          icon: CheckCircle
        }
      case 'no show':
        return { 
          label: 'No Show', 
          color: 'bg-red-100 text-red-800',
          icon: AlertTriangle
        }
      default:
        return { 
          label: status, 
          color: 'bg-gray-100 text-gray-800',
          icon: Clock
        }
    }
  }

  const statusInfo = getStatusInfo(worker.status)
  const StatusIcon = statusInfo.icon

  // Get current time entry info
  const activeEntry = worker.timeEntries?.find(entry => entry.clockIn && !entry.clockOut)
  const totalEntries = worker.timeEntries?.length || 0

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={worker.employeeAvatar} alt={worker.employeeName} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {worker.employeeName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">{worker.employeeName}</CardTitle>
            <p className="text-sm text-muted-foreground">{worker.roleOnShift}</p>
          </div>
          <div className="text-right">
            <Badge className={cn("text-xs font-medium", statusInfo.color)}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusInfo.label}
            </Badge>
            {totalEntries > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {totalEntries} time {totalEntries === 1 ? 'entry' : 'entries'}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Action Buttons - Always in same positions */}
        <div className="space-y-3">
          
          {/* PRIMARY ACTION ROW - Always visible, changes based on status */}
          <div className="grid grid-cols-2 gap-3">
            {worker.status === 'not_started' && (
              <>
                <Button
                  onClick={() => handleAction('clock_in', () => onClockIn(worker.id))}
                  disabled={loading || actionLoading !== null}
                  className="h-14 bg-green-600 hover:bg-green-700 text-white font-medium"
                >
                  {actionLoading === 'clock_in' ? (
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-5 w-5 mr-2" />
                  )}
                  <div className="text-center">
                    <div>Clock In</div>
                    <div className="text-xs opacity-90">Start Work</div>
                  </div>
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={loading || actionLoading !== null}
                      className="h-14 border-orange-500 text-orange-600 hover:bg-orange-50 font-medium"
                    >
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      <div className="text-center">
                        <div>No Show</div>
                        <div className="text-xs opacity-70">Didn't Come</div>
                      </div>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="w-[90vw] max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-center">
                        Mark as No Show?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-center">
                        <strong>{worker.employeeName}</strong> didn't show up for work today.
                        <br /><br />
                        <span className="text-red-600 font-medium">
                          This cannot be undone.
                        </span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col gap-2">
                      <AlertDialogAction
                        onClick={() => handleAction('no_show', () => onNoShow(worker.id, worker.employeeName))}
                        className="w-full bg-red-600 hover:bg-red-700"
                      >
                        Yes, Mark No Show
                      </AlertDialogAction>
                      <AlertDialogCancel className="w-full">
                        Cancel
                      </AlertDialogCancel>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {worker.status === 'Clocked In' && (
              <>
                <Button
                  onClick={() => handleAction('clock_out', () => onClockOut(worker.id))}
                  disabled={loading || actionLoading !== null}
                  className="h-14 bg-yellow-600 hover:bg-yellow-700 text-white font-medium"
                >
                  {actionLoading === 'clock_out' ? (
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Square className="h-5 w-5 mr-2" />
                  )}
                  <div className="text-center">
                    <div>Clock Out</div>
                    <div className="text-xs opacity-90">Take Break</div>
                  </div>
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      disabled={loading || actionLoading !== null}
                      className="h-14 font-medium"
                    >
                      <StopCircle className="h-5 w-5 mr-2" />
                      <div className="text-center">
                        <div>End Shift</div>
                        <div className="text-xs opacity-90">Go Home</div>
                      </div>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="w-[90vw] max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-center">
                        End Shift for {worker.employeeName}?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-center">
                        This will clock them out and end their shift for today.
                        <br /><br />
                        <span className="text-red-600 font-medium">
                          They cannot clock back in after this.
                        </span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col gap-2">
                      <AlertDialogAction
                        onClick={() => handleAction('end_shift', () => onEndShift(worker.id, worker.employeeName))}
                        className="w-full bg-red-600 hover:bg-red-700"
                      >
                        Yes, End Shift
                      </AlertDialogAction>
                      <AlertDialogCancel className="w-full">
                        Cancel
                      </AlertDialogCancel>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {worker.status === 'Clocked Out' && (
              <>
                <Button
                  onClick={() => handleAction('clock_in', () => onClockIn(worker.id))}
                  disabled={loading || actionLoading !== null}
                  className="h-14 bg-green-600 hover:bg-green-700 text-white font-medium"
                >
                  {actionLoading === 'clock_in' ? (
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-5 w-5 mr-2" />
                  )}
                  <div className="text-center">
                    <div>Clock In</div>
                    <div className="text-xs opacity-90">Back to Work</div>
                  </div>
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      disabled={loading || actionLoading !== null}
                      className="h-14 font-medium"
                    >
                      <StopCircle className="h-5 w-5 mr-2" />
                      <div className="text-center">
                        <div>End Shift</div>
                        <div className="text-xs opacity-90">Go Home</div>
                      </div>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="w-[90vw] max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-center">
                        End Shift for {worker.employeeName}?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-center">
                        This will end their shift for today.
                        <br /><br />
                        <span className="text-red-600 font-medium">
                          They cannot clock back in after this.
                        </span>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col gap-2">
                      <AlertDialogAction
                        onClick={() => handleAction('end_shift', () => onEndShift(worker.id, worker.employeeName))}
                        className="w-full bg-red-600 hover:bg-red-700"
                      >
                        Yes, End Shift
                      </AlertDialogAction>
                      <AlertDialogCancel className="w-full">
                        Cancel
                      </AlertDialogCancel>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {worker.status === 'Shift Ended' && (
              <div className="col-span-2 text-center py-4">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="font-medium text-green-700">Shift Completed</p>
                <p className="text-sm text-muted-foreground">Worker has finished for the day</p>
              </div>
            )}

            {worker.status === 'No Show' && (
              <div className="col-span-2 text-center py-4">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-600" />
                <p className="font-medium text-red-700">No Show</p>
                <p className="text-sm text-muted-foreground">Worker did not show up</p>
              </div>
            )}
          </div>

          {/* Current Status Info */}
          {activeEntry && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-700">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Currently Working</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Started at {new Date(activeEntry.clockIn!).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default MobileWorkerTimeCard
