
"use client"

import { useState, Fragment, useEffect, useMemo } from "react"
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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useUser } from "@/hooks/use-user"
import { mockShifts, mockJobs, mockClients, mockEmployees } from "@/lib/mock-data"
import { notFound, useRouter } from "next/navigation"
import { format } from 'date-fns'
import { Badge } from "@/components/ui/badge"
import type { AssignedPersonnel, TimesheetStatus, RoleCode } from "@/lib/types"
import { ArrowLeft, Building2, Calendar, Check, Clock, MapPin, User, Pencil, UserCheck, ClipboardCheck, Ban, Loader2, Minus, Plus, RefreshCw } from "lucide-react"
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
import { useToast } from "@/hooks/use-toast"
import { adjustTimesheet } from "@/ai/flows/adjust-timesheet"
import { cn } from "@/lib/utils"

const roleConfig: Record<RoleCode, { label: string; color: string }> = {
  CC: { label: 'Crew Chiefs', color: 'border-red-500' },
  SH: { label: 'Stage Hands', color: 'border-sky-500' },
  FO: { label: 'Fork Operators', color: 'border-amber-500' },
  RFO: { label: 'Reach Fork Ops', color: 'border-purple-500' },
  RG: { label: 'Riggers', color: 'border-indigo-500' },
  GL: { label: 'General Laborers', color: 'border-slate-500' },
};

function NumberInputControl({ value, onChange }: { value: number; onChange: (newValue: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => onChange(Math.max(0, value - 1))}>
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        type="number"
        className="h-8 w-12 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        min={0}
      />
      <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => onChange(value + 1)}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Helper function to round time
const roundTime = (date: Date, direction: 'up' | 'down') => {
  const newDate = new Date(date);
  const minutes = newDate.getMinutes();
  const mod = minutes % 15;

  if (mod === 0) {
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    return newDate;
  }

  if (direction === 'down') {
    newDate.setMinutes(minutes - mod, 0, 0);
  } else { // direction === 'up'
    newDate.setMinutes(minutes + (15 - mod), 0, 0);
  }
  
  return newDate;
};


export default function ShiftDetailPage({ params }: { params: { id: string } }) {
  const { user } = useUser()
  const router = useRouter()
  const initialShift = mockShifts.find((s) => s.id === params.id)

  const [shift, setShift] = useState(initialShift);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const { toast } = useToast();
  const [newAssignments, setNewAssignments] = useState<Record<string, string>>({});


  const [roleCounts, setRoleCounts] = useState<Record<RoleCode, number>>(() => {
    const counts = {} as Record<RoleCode, number>;
    if (initialShift) {
        initialShift.assignedPersonnel.forEach(p => {
        counts[p.roleCode] = (counts[p.roleCode] || 0) + 1;
        });
    }
    Object.keys(roleConfig).forEach(code => {
        if (!counts[code as RoleCode]) {
        counts[code as RoleCode] = 0;
        }
    });
    // A shift must have at least one crew chief
    if(counts['CC'] === 0 && initialShift?.assignedPersonnel.some(p => p.roleCode === 'CC')) counts['CC'] = 1;
    return counts;
  });

  const job = initialShift ? mockJobs.find(j => j.id === initialShift.jobId) : undefined;
  const client = job ? mockClients.find(c => c.id === job.clientId) : undefined;

  const hasCrewChiefView = user.role === 'Manager/Admin' || 
    (shift && shift.crewChief.id === user.id) ||
    (client && client.authorizedCrewChiefIds?.includes(user.id)) ||
    (job && job.authorizedCrewChiefIds?.includes(user.id)) ||
    (shift && shift.authorizedCrewChiefIds.includes(user.id));
  
  const canView = hasCrewChiefView || (shift && shift.assignedPersonnel.some(p => p.employee.id === user.id));

  useEffect(() => {
    if (initialShift && !canView) {
      router.push('/shifts');
    }
  }, [user, canView, initialShift, router]);

  if (!shift || !job || !client) {
    return notFound();
  }

  if (!canView) {
    return null; // Render nothing while redirecting
  }

  const canEdit = user.role === 'Manager/Admin' || (user.role === 'Crew Chief' && shift.crewChief.id === user.id);
  
  const personnelToDisplay = useMemo(() => {
    const displayRows: (AssignedPersonnel & { isPlaceholder: boolean; id: string })[] = [];
    let placeholderId = 0;

    Object.entries(roleConfig).forEach(([code, config]) => {
        const roleCode = code as RoleCode;
        const requiredCount = roleCounts[roleCode] || 0;
        const assignedForRole = shift.assignedPersonnel.filter(p => p.roleCode === roleCode);

        for (let i = 0; i < requiredCount; i++) {
            if (i < assignedForRole.length) {
                displayRows.push({ ...assignedForRole[i], isPlaceholder: false, id: assignedForRole[i].employee.id });
            } else {
                const pId = `placeholder-${placeholderId++}`;
                displayRows.push({
                    id: pId,
                    employee: { id: pId, name: 'Unassigned', avatar: '', certifications: [], location: '', performance: 0 },
                    isPlaceholder: true,
                    roleCode,
                    roleOnShift: config.label.slice(0, -1),
                    status: 'Clocked Out',
                    timeEntries: [],
                });
            }
        }
    });

    // For employee view, filter to only show themselves
    if (user.role === 'Employee') {
        return displayRows.filter(p => !p.isPlaceholder && p.employee.id === user.id);
    }
    
    return displayRows;
  }, [roleCounts, shift.assignedPersonnel, user.role, user.id]);

  const assignedEmployeeIds = useMemo(() => new Set(shift.assignedPersonnel.map(p => p.employee.id)), [shift.assignedPersonnel]);

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
  
  const handleNewAssignment = (placeholderId: string, employeeId: string) => {
    setNewAssignments(prev => ({ ...prev, [placeholderId]: employeeId }));
  };

  const handleSaveChanges = () => {
    if (Object.keys(newAssignments).length === 0) {
        toast({ title: "No changes to save.", description: "Select an employee from a dropdown to assign them." });
        return;
    }

    setShift(currentShift => {
        if (!currentShift) return currentShift;

        let updatedPersonnel = [...currentShift.assignedPersonnel];
        
        Object.entries(newAssignments).forEach(([placeholderId, employeeId]) => {
            const placeholderInfo = personnelToDisplay.find(p => p.id === placeholderId);
            const employeeInfo = mockEmployees.find(e => e.id === employeeId);

            if (placeholderInfo && employeeInfo) {
                const newPersonnel: AssignedPersonnel = {
                    employee: employeeInfo,
                    roleOnShift: placeholderInfo.roleOnShift,
                    roleCode: placeholderInfo.roleCode,
                    status: 'Clocked Out',
                    timeEntries: []
                };
                updatedPersonnel.push(newPersonnel);
            }
        });
        
        return { ...currentShift, assignedPersonnel: updatedPersonnel };
    });
    
    setNewAssignments({});

    toast({
        title: "Changes Saved",
        description: "New personnel have been assigned to the shift.",
    });
  };

  const handleTimeAction = (person: AssignedPersonnel) => {
    let updatedPerson = JSON.parse(JSON.stringify(person));
    
    // Initial check-in
    if (person.status === 'Clocked Out' && person.timeEntries.length === 0) {
      const roundedTime = roundTime(new Date(), 'down');
      const currentTime = format(roundedTime, 'HH:mm');
      updatedPerson.status = 'Clocked In';
      updatedPerson.timeEntries.push({ clockIn: currentTime });
    } else {
      const lastEntry = updatedPerson.timeEntries[updatedPerson.timeEntries.length - 1];
      const isClockedIn = lastEntry && lastEntry.clockIn && !lastEntry.clockOut;

      if (isClockedIn) {
        const roundedTime = roundTime(new Date(), 'up');
        const currentTime = format(roundedTime, 'HH:mm');
        lastEntry.clockOut = currentTime;
        updatedPerson.status = 'On Break';
      } else {
        if (updatedPerson.timeEntries.length < 3) {
           const roundedTime = roundTime(new Date(), 'down');
           const currentTime = format(roundedTime, 'HH:mm');
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
      lastEntry.clockOut = format(roundTime(new Date(), 'up'), 'HH:mm');
    }
    updatedPerson.status = 'Shift Ended';
    handlePersonnelUpdate(updatedPerson);
  };

  const handleContinueShift = (person: AssignedPersonnel) => {
    let updatedPerson = JSON.parse(JSON.stringify(person));
    // Revert status to allow further time entries.
    // 'On Break' is a safe state that requires an explicit "Clock In" action.
    if (updatedPerson.timeEntries.length > 0) {
      updatedPerson.status = 'On Break';
    } else {
      updatedPerson.status = 'Clocked Out';
    }
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
            lastEntry.clockOut = format(roundTime(new Date(), 'up'), 'HH:mm');
          }
          updatedPerson.status = 'Shift Ended';
          return updatedPerson;
        }
        return p;
      });

      return { ...currentShift, assignedPersonnel: updatedPersonnelList };
    });
  };

  const handleFinalizeTimesheet = async () => {
    setIsFinalizing(true);
    try {
      const personnelForTimesheet = shift.assignedPersonnel.filter(p => p.timeEntries.some(t => t.clockIn));
      const result = await adjustTimesheet({ personnel: personnelForTimesheet });

      setShift(currentShift => {
        if (!currentShift) return currentShift;
        const adjustedPersonnelMap = new Map(result.adjustedPersonnel.map(p => [p.employee.id, p]));
        const fullyUpdatedPersonnel = currentShift.assignedPersonnel.map(p => 
          adjustedPersonnelMap.has(p.employee.id) ? (adjustedPersonnelMap.get(p.employee.id)!) : p
        );
        return { 
          ...currentShift, 
          assignedPersonnel: fullyUpdatedPersonnel,
          timesheetStatus: 'Awaiting Client Approval' 
        };
      });

      toast({
        title: "Timesheet Adjusted & Finalized",
        description: result.adjustmentsSummary,
      });

    } catch (error) {
      console.error("Error finalizing timesheet:", error);
      toast({
        title: "Error",
        description: "Could not finalize timesheet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFinalizing(false);
    }
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/shifts"><ArrowLeft className="mr-2 h-4 w-4" />Back to Shifts</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Shift Details</span>
              <div className="flex items-center gap-2">
                  <Link href={`/timesheets/${shift.timesheetId}/approve`}>
                    <Badge variant={getTimesheetStatusVariant(shift.timesheetStatus)} className="cursor-pointer hover:opacity-90">{shift.timesheetStatus.replace(/ /g, '\u00A0')}</Badge>
                  </Link>
                  {canEdit && (
                  <Button size="icon" variant="outline" className="h-8 w-8">
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit Shift Details</span>
                  </Button>
                )}
              </div>
            </CardTitle>
            <CardDescription>
              {job.name} - {shift.location}
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
                <Link href={`/clients/${client.id}`} className="hover:underline text-primary">
                  {client.name}
                </Link>
              </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
                <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{client.address}</span>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{client.contactPerson}</span>
              </div>
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <span>{client.contactPhone}</span>
              </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {hasCrewChiefView && (
          <Card>
            <CardHeader>
                <CardTitle>Required Personnel</CardTitle>
                <CardDescription>Set the number of workers needed for each role on this shift.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(roleConfig).map(([code, config]) => (
                <div key={code} className="space-y-1">
                    <Label htmlFor={`count-${code}`}>{config.label}</Label>
                    <NumberInputControl
                        value={roleCounts[code as RoleCode]}
                        onChange={(newValue) => setRoleCounts(counts => ({ ...counts, [code]: newValue }))}
                    />
                </div>
                ))}
            </CardContent>
          </Card>
        )}

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
                   {hasCrewChiefView && (
                     <>
                        {[1, 2, 3].map(i => (
                            <Fragment key={i}>
                            <TableHead>In {i}</TableHead>
                            <TableHead>Out {i}</TableHead>
                            </Fragment>
                        ))}
                        <TableHead className="text-right">Actions</TableHead>
                     </>
                   )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {personnelToDisplay.map((person) => {
                  const isPlaceholder = person.isPlaceholder;
                  const roleColorClass = roleConfig[person.roleCode as RoleCode]?.color || 'border-transparent';
                  
                  const availableForThisSlot = mockEmployees.filter(emp => {
                      if (assignedEmployeeIds.has(emp.id)) return false;
                      
                      const isSelectedForOtherSlot = Object.entries(newAssignments).some(
                          ([pId, eId]) => pId !== person.id && eId === emp.id
                      );
                      if (isSelectedForOtherSlot) return false;
                      
                      return true;
                  });

                  return (
                  <TableRow key={person.id} className={cn(!isPlaceholder && getRowClass(person.status), 'border-l-4', roleColorClass)}>
                    <TableCell>
                      {isPlaceholder ? (
                        <Select
                            disabled={!canEdit}
                            value={newAssignments[person.id] || ""}
                            onValueChange={(employeeId) => handleNewAssignment(person.id, employeeId)}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder={`Select ${person.roleOnShift}...`} />
                            </SelectTrigger>
                            <SelectContent>
                                {availableForThisSlot.map(emp => (
                                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      ) : (
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
                      )}
                    </TableCell>
                    
                    {hasCrewChiefView && (
                        isPlaceholder ? (
                            <TableCell colSpan={7} className="text-center text-muted-foreground italic">
                                Unassigned
                            </TableCell>
                        ) : (
                        <>
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
                                {canEdit && (() => {
                                  if (person.status === 'Shift Ended') {
                                    return (
                                      <Button size="sm" variant="secondary" onClick={() => handleContinueShift(person)}>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Continue Shift
                                      </Button>
                                    );
                                  }

                                  const clockInOutButton = () => {
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
                                    <>
                                      {clockInOutButton()}
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button size="sm" variant="destructive"><Ban className="mr-2 h-4 w-4" /> End Shift</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>End shift for {person.employee.name}?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              This will finalize their time entries for this shift. This action can be undone if necessary.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleEndShift(person)}>Confirm End Shift</AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </>
                                  );
                                })()}
                              </div>
                            </TableCell>
                        </>
                        )
                    )}
                  </TableRow>
                )})}
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
                <Button onClick={handleFinalizeTimesheet} disabled={shift.timesheetStatus !== 'Pending Finalization' || isFinalizing}>
                {isFinalizing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Finalize Timesheet
              </Button>
              <Button onClick={handleSaveChanges}>Save Changes</Button>
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
    </div>
  )
}
