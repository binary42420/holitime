'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { 
  Users, 
  Clock, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  StopCircle,
  Download
} from 'lucide-react'
import { MobileWorkerTimeCard } from './mobile-worker-time-card'
import { cn } from '@/lib/utils'

interface Worker {
  id: string
  employeeName: string
  employeeAvatar?: string
  status: string
  roleOnShift: string
  timeEntries: any[]
}

interface MobileShiftManagerProps {
  shiftId: string
  workers: Worker[]
  onClockIn: (workerId: string) => Promise<void>
  onClockOut: (workerId: string) => Promise<void>
  onEndShift: (workerId: string, workerName: string) => Promise<void>
  onNoShow: (workerId: string, workerName: string) => Promise<void>
  onClockOutAll: () => Promise<void>
  onEndAllShifts: () => Promise<void>
  onFinalizeTimesheet: () => void
  loading?: boolean
  timesheetStatus?: string
  className?: string
}

export const MobileShiftManager: React.FC<MobileShiftManagerProps> = ({
  shiftId,
  workers,
  onClockIn,
  onClockOut,
  onEndShift,
  onNoShow,
  onClockOutAll,
  onEndAllShifts,
  onFinalizeTimesheet,
  loading = false,
  timesheetStatus,
  className = ""
}) => {
  const [bulkActionLoading, setBulkActionLoading] = useState<string | null>(null)

  const handleBulkAction = async (action: string, fn: () => Promise<void>) => {
    setBulkActionLoading(action)
    try {
      await fn()
    } finally {
      setBulkActionLoading(null)
    }
  }

  // Calculate worker status counts
  const statusCounts = workers.reduce((acc, worker) => {
    const status = worker.status.toLowerCase()
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const workingCount = statusCounts['clocked in'] || 0
  const onBreakCount = statusCounts['clocked out'] || 0
  const finishedCount = statusCounts['shift ended'] || 0
  const noShowCount = statusCounts['no show'] || 0
  const notStartedCount = statusCounts['not_started'] || 0

  const canFinalizeTimesheet = workers.length > 0 && 
    (finishedCount + noShowCount) === workers.length &&
    !timesheetStatus

  return (
    <div className={cn("space-y-4", className)}>
      {/* Quick Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Shift Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{workingCount}</div>
              <div className="text-sm text-green-600">Working</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-700">{onBreakCount}</div>
              <div className="text-sm text-yellow-600">On Break</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{finishedCount}</div>
              <div className="text-sm text-blue-600">Finished</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-700">{notStartedCount + noShowCount}</div>
              <div className="text-sm text-gray-600">Not Working</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            {/* Clock Out All */}
            {workingCount > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={loading || bulkActionLoading !== null}
                    className="h-12 w-full border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                  >
                    {bulkActionLoading === 'clock_out_all' ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Clock className="h-4 w-4 mr-2" />
                    )}
                    Clock Out All Workers ({workingCount})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="w-[90vw] max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-center">
                      Clock Out All Workers?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                      This will clock out all {workingCount} workers who are currently working.
                      <br /><br />
                      They can clock back in when they return from break.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col gap-2">
                    <AlertDialogAction
                      onClick={() => handleBulkAction('clock_out_all', onClockOutAll)}
                      className="w-full bg-yellow-600 hover:bg-yellow-700"
                    >
                      Yes, Clock Out All
                    </AlertDialogAction>
                    <AlertDialogCancel className="w-full">Cancel</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* End All Shifts */}
            {(workingCount + onBreakCount) > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={loading || bulkActionLoading !== null}
                    className="h-12 w-full"
                  >
                    {bulkActionLoading === 'end_all_shifts' ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <StopCircle className="h-4 w-4 mr-2" />
                    )}
                    End All Shifts ({workingCount + onBreakCount})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="w-[90vw] max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-center">
                      End All Shifts?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                      This will end the shift for all {workingCount + onBreakCount} active workers.
                      <br /><br />
                      <span className="text-red-600 font-medium">
                        They cannot clock back in after this.
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-col gap-2">
                    <AlertDialogAction
                      onClick={() => handleBulkAction('end_all_shifts', onEndAllShifts)}
                      className="w-full bg-red-600 hover:bg-red-700"
                    >
                      Yes, End All Shifts
                    </AlertDialogAction>
                    <AlertDialogCancel className="w-full">Cancel</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Finalize Timesheet */}
            {canFinalizeTimesheet && (
              <Button
                onClick={onFinalizeTimesheet}
                disabled={loading}
                className="h-12 w-full bg-blue-600 hover:bg-blue-700"
              >
                <FileText className="h-4 w-4 mr-2" />
                Finalize Timesheet
              </Button>
            )}

            {/* Timesheet Status */}
            {timesheetStatus && (
              <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <p className="font-medium text-green-700">Timesheet Status</p>
                <Badge className="mt-1 bg-green-100 text-green-800">
                  {timesheetStatus.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Worker Cards */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Workers ({workers.length})
        </h3>
        
        {workers.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-medium text-lg mb-2">No Workers Assigned</h3>
              <p className="text-muted-foreground">
                No workers have been assigned to this shift yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          workers.map((worker) => (
            <MobileWorkerTimeCard
              key={worker.id}
              worker={worker}
              onClockIn={onClockIn}
              onClockOut={onClockOut}
              onEndShift={onEndShift}
              onNoShow={onNoShow}
              loading={loading}
            />
          ))
        )}
      </div>

      {/* Bottom Spacing for Mobile Navigation */}
      <div className="h-20 md:h-0" />
    </div>
  )
}

export default MobileShiftManager
