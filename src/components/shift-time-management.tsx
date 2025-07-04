"use client"

import React, { useState, useEffect } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { 
  Clock, 
  Play, 
  Square, 
  CheckCircle, 
  AlertCircle,
  Users,
  ChevronDown
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
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

interface TimeEntry {
  id: string
  entryNumber: number
  clockIn?: string
  clockOut?: string
  isActive: boolean
}

interface AssignedWorker {
  id: string
  employeeId: string
  employeeName: string
  employeeAvatar: string
  roleOnShift: string
  roleCode: string
  status: 'not_started' | 'clocked_in' | 'clocked_out' | 'shift_ended' | 'no_show'
  timeEntries: TimeEntry[]
}

interface ShiftTimeManagementProps {
  shiftId: string
  assignedPersonnel: AssignedWorker[]
  canManage: boolean
  onUpdate: () => void
}

export default function ShiftTimeManagement({ 
  shiftId, 
  assignedPersonnel, 
  canManage, 
  onUpdate 
}: ShiftTimeManagementProps) {
  const { toast } = useToast()
  const [workers, setWorkers] = useState<AssignedWorker[]>(assignedPersonnel)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setWorkers(assignedPersonnel)
  }, [assignedPersonnel])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clocked_in':
        return 'bg-green-100 border-green-300'
      case 'clocked_out':
        return 'bg-yellow-100 border-yellow-300'
      case 'shift_ended':
        return 'bg-gray-100 border-gray-300'
      default:
        return 'bg-white border-gray-200'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'clocked_in':
        return <Badge variant="default" className="bg-green-600"><Play className="mr-1 h-3 w-3" />Clocked In</Badge>
      case 'clocked_out':
        return <Badge variant="secondary"><Square className="mr-1 h-3 w-3" />Clocked Out</Badge>
      case 'shift_ended':
        return <Badge variant="outline"><CheckCircle className="mr-1 h-3 w-3" />Shift Ended</Badge>
      case 'no_show':
        return <Badge variant="destructive" className="bg-orange-600"><AlertCircle className="mr-1 h-3 w-3" />No Show</Badge>
      default:
        return <Badge variant="outline">Not Started</Badge>
    }
  }

  const handleClockIn = async (workerId: string) => {
    setLoading(true)
    const worker = workers.find(w => w.id === workerId);
    try {
      const response = await fetch(`/api/shifts/${shiftId}/clock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId }),
      })

      if (response.ok) {
        toast({
          title: "Clocked In",
          description: `${worker?.employeeName} has been clocked in at ${format(new Date(), "p")}.`,
        })
        onUpdate()
      } else {
        throw new Error('Failed to clock in')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clock in employee.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClockOut = async (workerId: string) => {
    setLoading(true)
    const worker = workers.find(w => w.id === workerId);
    try {
      const response = await fetch(`/api/shifts/${shiftId}/clock-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId }),
      })

      if (response.ok) {
        toast({
          title: "Clocked Out",
          description: `${worker?.employeeName} has been clocked out at ${format(new Date(), "p")}.`,
        })
        onUpdate()
      } else {
        throw new Error('Failed to clock out')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clock out employee.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEndShift = async (workerId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/shifts/${shiftId}/end-shift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId }),
      })

      if (response.ok) {
        toast({
          title: "Shift Ended",
          description: "Employee's shift has been ended.",
        })
        onUpdate()
      } else {
        throw new Error('Failed to end shift')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end shift for employee.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleNoShow = async (workerId: string, employeeName: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/shifts/${shiftId}/no-show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId }),
      })

      if (response.ok) {
        toast({
          title: "Marked as No Show",
          description: `${employeeName} has been marked as no show.`,
        })
        onUpdate()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to mark as no show')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to mark as no show.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEndAllShifts = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/shifts/${shiftId}/end-all-shifts`, {
        method: 'POST',
      })

      if (response.ok) {
        toast({
          title: "All Shifts Ended",
          description: "All active shifts have been ended.",
        })
        onUpdate()
      } else {
        throw new Error('Failed to end all shifts')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end all shifts.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClockOutAll = async () => {
    const clockedInWorkers = workers.filter(worker =>
      worker.status === 'clocked_in'
    )

    if (clockedInWorkers.length === 0) {
      toast({
        title: "No Workers to Clock Out",
        description: "All workers are already clocked out or haven't clocked in yet.",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/shifts/${shiftId}/clock-out-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        toast({
          title: "Workers Clocked Out",
          description: `Successfully clocked out ${clockedInWorkers.length} workers.`,
        })
        onUpdate()
      } else {
        throw new Error('Failed to clock out workers')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clock out workers. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFinalizeShift = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/shifts/${shiftId}/finalize`, {
        method: 'POST',
      })

      if (response.ok) {
        toast({
          title: "Shift Finalized",
          description: "Shift has been sent for client approval.",
        })
        onUpdate()
      } else {
        throw new Error('Failed to finalize shift')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to finalize shift.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateTimeEntry = async (workerId: string, entryNumber: number, field: 'clockIn' | 'clockOut', value: string) => {
    try {
      const response = await fetch(`/api/shifts/${shiftId}/update-time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId, entryNumber, field, value }),
      })

      if (response.ok) {
        onUpdate()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update time entry.",
        variant: "destructive",
      })
    }
  }

  const renderTimeInputs = (worker: AssignedWorker) => (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-2">
      {[1, 2, 3].map((entryNum) => {
        const entry = worker.timeEntries.find(e => e.entryNumber === entryNum)
        return (
          <React.Fragment key={entryNum}>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Clock In {entryNum}</label>
              <Input
                type="time"
                value={entry?.clockIn ? format(new Date(entry.clockIn), "HH:mm") : ''}
                onChange={(e) => {
                  const today = format(new Date(), "yyyy-MM-dd")
                  const datetimeValue = e.target.value ? `${today}T${e.target.value}` : ''
                  updateTimeEntry(worker.id, entryNum, 'clockIn', datetimeValue)
                }}
                className="w-full text-sm"
                disabled={worker.status === 'shift_ended'}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Clock Out {entryNum}</label>
              <Input
                type="time"
                value={entry?.clockOut ? format(new Date(entry.clockOut), "HH:mm") : ''}
                onChange={(e) => {
                  const today = format(new Date(), "yyyy-MM-dd")
                  const datetimeValue = e.target.value ? `${today}T${e.target.value}` : ''
                  updateTimeEntry(worker.id, entryNum, 'clockOut', datetimeValue)
                }}
                className="w-full text-sm"
                disabled={worker.status === 'shift_ended'}
              />
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )

  const renderActionButtons = (worker: AssignedWorker) => (
    <div className="flex flex-col gap-2 mt-4">
      {worker.status === 'not_started' && (
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          className="border-orange-500 text-orange-600 hover:bg-orange-50"
          onClick={() => {
            if (window.confirm(`Mark ${worker.employeeName} as no show? This action cannot be undone.`)) {
              handleNoShow(worker.id, worker.employeeName)
            }
          }}
        >
          <AlertCircle className="h-4 w-4 mr-2" />
          Mark as No Show
        </Button>
      )}
      
      {(worker.status === 'clocked_out' || worker.status === 'clocked_in') && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive" disabled={loading}>
              <CheckCircle className="h-4 w-4 mr-2" />
              End Shift
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>End Shift for {worker.employeeName}</AlertDialogTitle>
              <AlertDialogDescription>
                This will end the shift for this employee and record their final clock out time. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleEndShift(worker.id)}>
                End Shift
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )

  if (!canManage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assigned Personnel
          </CardTitle>
          <CardDescription>View assigned workers for this shift</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {workers.map((worker) => (
              <div key={worker.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={worker.employeeAvatar} />
                    <AvatarFallback>
                      {worker.employeeName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{worker.employeeName}</div>
                    <div className="text-sm text-muted-foreground">{worker.roleOnShift}</div>
                  </div>
                </div>
                {getStatusBadge(worker.status)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time Management
            </CardTitle>
            <CardDescription>Manage clock in/out times for assigned workers</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={loading}>
                  <Square className="h-4 w-4 mr-2" />
                  Clock Out All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clock Out All Workers</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will clock out all currently clocked-in employees without ending their shifts. Workers can still clock back in if needed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClockOutAll}>
                    Clock Out All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={loading}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  End All Shifts
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>End All Shifts</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will clock out all currently clocked-in employees and end their shifts. This action cannot be undone.
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
                <Button size="sm" disabled={loading}>
                  Finalize Shift
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Finalize Shift</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will finalize the shift and send it for client approval. Make sure all time entries are correct before proceeding.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleFinalizeShift}>
                    Finalize Shift
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Mobile View: Card-based layout */}
        <div className="space-y-4 md:hidden">
          {workers.map((worker) => (
            <Card key={worker.id} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between p-4 bg-muted/30">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={worker.employeeAvatar} />
                    <AvatarFallback>
                      {worker.employeeName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-bold">{worker.employeeName}</div>
                    <div className="text-sm text-muted-foreground">{worker.roleOnShift}</div>
                  </div>
                </div>
                {getStatusBadge(worker.status)}
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {worker.status !== 'shift_ended' && worker.status !== 'no_show' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => handleClockIn(worker.id)}
                      disabled={loading || worker.status === 'clocked_in'}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Clock In
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleClockOut(worker.id)}
                      disabled={loading || worker.status !== 'clocked_in'}
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Clock Out
                    </Button>
                  </div>
                )}
                <div>
                  {renderTimeInputs(worker)}
                </div>
                <div>
                  {renderActionButtons(worker)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop View: Table layout */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Time Entries</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((worker) => (
                <TableRow key={worker.id} className={getStatusColor(worker.status)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={worker.employeeAvatar} />
                        <AvatarFallback>
                          {worker.employeeName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{worker.employeeName}</div>
                        <div className="text-sm text-muted-foreground">{worker.roleCode}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{worker.roleOnShift}</Badge>
                  </TableCell>
                  
                  <TableCell colSpan={6}>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="item-1">
                        <AccordionTrigger className="text-sm">
                          Manage Time
                        </AccordionTrigger>
                        <AccordionContent>
                          {renderTimeInputs(worker)}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </TableCell>
                  
                  <TableCell>{getStatusBadge(worker.status)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {worker.status !== 'shift_ended' && worker.status !== 'no_show' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleClockIn(worker.id)}
                            disabled={loading || worker.status === 'clocked_in'}
                            className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Clock In
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleClockOut(worker.id)}
                            disabled={loading || worker.status !== 'clocked_in'}
                            className="text-xs px-2 py-1"
                          >
                            <Square className="h-3 w-3 mr-1" />
                            Clock Out
                          </Button>
                        </>
                      )}
                      {renderActionButtons(worker)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
