"use client"

import { useState, Fragment } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useUser } from "@/hooks/use-user"
import { mockShifts } from "@/lib/mock-data"
import { notFound } from "next/navigation"
import { format } from 'date-fns'
import { Badge } from "@/components/ui/badge"
import type { AssignedPersonnel, TimesheetStatus } from "@/lib/types"
import { ArrowLeft, Building2, Calendar, Check, Clock, LogOut, MapPin, User, Pencil, UserCheck, ClipboardCheck, Ban } from "lucide-react"
import Link from "next/link"
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

export default function ShiftDetailPage({ params }: { params: { id: string } }) {
  const { user } = useUser()
  const initialShift = mockShifts.find((s) => s.id === params.id)

  const [shift, setShift] = useState(initialShift);

  if (!shift) {
    notFound()
  }

  const canEdit = user.role === 'Crew Chief' || user.role === 'Manager/Admin'

  const handlePersonnelUpdate = (updatedPersonnel: AssignedPersonnel) => {
    setShift(currentShift => {
      if (!currentShift) return currentShift;
      return {
        ...currentShift,
        assignedPersonnel: currentShift.assignedPersonnel.map(p => 
          p.employee.id === updatedPersonnel.employee.id ? updatedPersonnel : p
        )
      };
    });
  };

  const handleTimeAction = (person: AssignedPersonnel) => {
    const currentTime = format(new Date(), 'HH:mm');
    let updatedPerson = JSON.parse(JSON.stringify(person));
    
    // Initial check-in
    if (person.status === 'Clocked Out' && person.timeEntries.length === 0) {
      updatedPerson.status = 'Clocked In';
      updatedPerson.timeEntries.push({ clockIn: currentTime });
    } else {
      const lastEntry = updatedPerson.timeEntries[updatedPerson.timeEntries.length - 1];
      const isClockedIn = lastEntry && lastEntry.clockIn && !lastEntry.clockOut;

      if (isClockedIn) {
        lastEntry.clockOut = currentTime;
        updatedPerson.status = 'On Break';
      } else {
        if (updatedPerson.timeEntries.length < 3) {
          updatedPerson.timeEntries.push({ clockIn: currentTime });
          updatedPerson.status = 'Clocked In';
        }
      }
    }
    handlePersonnelUpdate(updatedPerson);
  };

  const handleEndShift = (person: AssignedPersonnel) => {
    let updatedPerson = JSON.parse(JSON.stringify(person));
    const lastEntry = updatedPerson.timeEntries[updatedPerson.timeEntries.length - 1];
    
    if (updatedPerson.status === 'Clocked In' && lastEntry) {
      lastEntry.clockOut = format(new Date(), 'HH:mm');
    }
    updatedPerson.status = 'Shift Ended';
    handlePersonnelUpdate(updatedPerson);
  };
  
  const handleEndShiftAll = () => {
    setShift(currentShift => {
      if (!currentShift) return currentShift;

      const updatedPersonnelList = currentShift.assignedPersonnel.map(p => {
        if (p.status === 'Clocked In' || p.status === 'On Break') {
          const updatedPerson = JSON.parse(JSON.stringify(p));
          const lastEntry = updatedPerson.timeEntries[updatedPerson.timeEntries.length - 1];
          
          if (updatedPerson.status === 'Clocked In' && lastEntry && !lastEntry.clockOut) {
            lastEntry.clockOut = format(new Date(), 'HH:mm');
          }
          updatedPerson.status = 'Shift Ended';
          return updatedPerson;
        }
        return p;
      });

      return { ...currentShift, assignedPersonnel: updatedPersonnelList };
    });
  };

  const handleFinalizeTimesheet = () => {
    setShift(currentShift => currentShift ? { ...currentShift, timesheetStatus: 'Awaiting Client Approval' } : currentShift);
    // In a real app, this would also create/update the timesheet record in the database.
  };

  const getRowClass = (status: AssignedPersonnel['status']) => {
    switch (status) {
      case 'Clocked In': return 'bg-green-100 dark:bg-green-900/30';
      case 'On Break': return 'bg-yellow-100 dark:bg-yellow-900/30';
      case 'Shift Ended': return 'bg-blue-100 dark:bg-blue-900/30';
      default: return '';
    }
  }

  const getTimesheetStatusVariant = (status: TimesheetStatus) => {
    switch (status) {
      case 'Approved': return 'default';
      case 'Awaiting Client Approval': return 'destructive';
      case 'Awaiting Manager Approval': return 'secondary';
      case 'Pending Finalization': return 'outline';
      default: return 'secondary'
    }
  }

  const renderActionButton = (person: AssignedPersonnel) => {
    if (!canEdit || person.status === 'Shift Ended') return null;

    if (person.status === 'Clocked Out' && person.timeEntries.length === 0) {
      return <Button size="sm" onClick={() => handleTimeAction(person)}><Check className="mr-2 h-4 w-4" /> Check In</Button>;
    }
    
    if (person.status === 'Clocked In' || person.status === 'On Break') {
      const isClockedIn = person.status === 'Clocked In';
      const canClockIn = person.timeEntries.length < 3 || (person.timeEntries.length === 3 && !person.timeEntries[2].clockOut);
      return <Button variant={isClockedIn ? "outline" : "default"} size="sm" onClick={() => handleTimeAction(person)} disabled={!isClockedIn && !canClockIn}>{isClockedIn ? "Clock Out" : "Clock In"}</Button>;
    }

    return null;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/shifts"><ArrowLeft className="mr-2 h-4 w-4" />Back to Shifts</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Workers</CardTitle>
              <CardDescription>Manage assigned workers and their times.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    {[1, 2, 3].map(i => (
                      <Fragment key={i}>
                        <TableHead>In {i}</TableHead>
                        <TableHead>Out {i}</TableHead>
                      </Fragment>
                    ))}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shift.assignedPersonnel.map((person) => (
                    <TableRow key={person.employee.id} className={getRowClass(person.status)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                           <Avatar className="h-9 w-9">
                            <AvatarImage src={person.employee.avatar} alt={person.employee.name} data-ai-hint="person face" />
                            <AvatarFallback>{person.employee.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium">{person.employee.name}</span>
                            <span className="text-xs text-muted-foreground">{person.roleOnShift}</span>
                          </div>
                        </div>
                      </TableCell>
                      
                      {[...Array(3)].map((_, index) => (
                        <Fragment key={index}>
                          <TableCell>
                            <Input
                              type="time"
                              value={person.timeEntries[index]?.clockIn || ''}
                              disabled={!canEdit}
                              className="w-28"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="time"
                              value={person.timeEntries[index]?.clockOut || ''}
                              disabled={!canEdit || !person.timeEntries[index]?.clockIn}
                              className="w-28"
                            />
                          </TableCell>
                        </Fragment>
                      ))}

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {renderActionButton(person)}
                          {canEdit && person.status !== 'Shift Ended' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive"><Ban className="mr-2 h-4 w-4" /> End Shift</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>End shift for {person.employee.name}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will finalize their time entries for this shift. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleEndShift(person)}>Confirm End Shift</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            {canEdit && (
              <CardFooter className="justify-end gap-2 border-t pt-6">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">
                      <Ban className="mr-2 h-4 w-4" />
                      End All Shifts
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>End all active shifts?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will end the shift for all currently clocked-in or on-break employees. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleEndShiftAll}>Confirm End All</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                 <Button onClick={handleFinalizeTimesheet} disabled={shift.timesheetStatus !== 'Pending Finalization'}>
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  Finalize Timesheet
                </Button>
                <Button>Save Changes</Button>
              </CardFooter>
            )}
          </Card>

          {canEdit && <Card>
            <CardHeader>
              <CardTitle>Shift Notes</CardTitle>
              <CardDescription>Add or update notes for this shift. Visible to the crew chief and manager.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={shift.notes}
                onChange={(e) => setShift({...shift, notes: e.target.value})}
                placeholder="Add any important notes for the shift..."
              />
              <Button>Save Notes</Button>
            </CardContent>
          </Card>}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Shift Details</span>
                <div className="flex items-center gap-2">
                   <Badge variant={getTimesheetStatusVariant(shift.timesheetStatus)}>{shift.timesheetStatus.replace(/ /g, '\u00A0')}</Badge>
                   {canEdit && (
                    <Button size="icon" variant="outline" className="h-8 w-8">
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit Shift Details</span>
                    </Button>
                  )}
                </div>
              </CardTitle>
              <CardDescription>
                {shift.client.name} - {shift.location}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(shift.date), 'EEEE, MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{shift.startTime} - {shift.endTime}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{shift.location}</span>
                </div>
                 <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Crew Chief: {shift.crewChief.name}</span>
                </div>
            </CardContent>
          </Card>
           <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
                <CardDescription>
                  <Link href={`/clients/${shift.client.id}`} className="hover:underline text-primary">
                    {shift.client.name}
                  </Link>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                 <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{shift.client.address}</span>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{shift.client.contactPerson}</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  <span>{shift.client.contactPhone}</span>
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
