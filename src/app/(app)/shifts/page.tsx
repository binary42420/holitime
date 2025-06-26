
"use client"

import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { useMemo } from "react"
import { MoreHorizontal, PlusCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@/hooks/use-user"
import { useShifts } from "@/hooks/use-api"
import type { Shift, TimesheetStatus } from "@/lib/types"
import { format, isWithinInterval, subHours, addHours } from "date-fns"

export default function ShiftsPage() {
  const { user } = useUser()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: shiftsData, loading, error } = useShifts()

  const shiftsToDisplay = useMemo(() => {
    if (!shiftsData?.shifts) return []

    let filteredShifts = shiftsData.shifts

    const statusFilter = searchParams.get('status')
    if (statusFilter) {
      // The type assertion is safe because we are comparing to a property of type Shift['status']
      filteredShifts = filteredShifts.filter(shift => shift.status === (statusFilter as Shift['status']))
    }

    const rangeFilter = searchParams.get('range')
    if (rangeFilter === 'today') {
      const now = new Date()
      filteredShifts = filteredShifts.filter(shift => isWithinInterval(new Date(shift.date), {
        start: subHours(now, 24),
        end: addHours(now, 48)
      }))
    }
    
    return filteredShifts
  }, [shiftsData, searchParams])


  const getStatusVariant = (status: Shift['status']) => {
    switch (status) {
      case 'Completed':
        return 'default'
      case 'In Progress':
        return 'destructive'
      case 'Cancelled':
        return 'outline'
      default:
        return 'secondary'
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Shifts</h1>
        {user.role === 'Manager/Admin' && (
          <Button size="sm" className="gap-1">
            <PlusCircle className="h-4 w-4" />
            New Shift
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shift Schedule</CardTitle>
          <CardDescription>
            {user.role === 'Employee' ? 'Your assigned shifts.' : 'All company shifts.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading shifts...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-destructive">Error loading shifts: {error}</div>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="hidden md:table-cell">Crew Chief</TableHead>
                <TableHead>Timesheet Status</TableHead>
                {user.role !== 'Employee' && (
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {shiftsToDisplay.map((shift) => (
                  <TableRow
                    key={shift.id}
                    onClick={() => router.push(`/shifts/${shift.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">{shift.clientName || 'N/A'}</TableCell>
                    <TableCell>{format(new Date(shift.date), 'EEE, MMM d')}</TableCell>
                    <TableCell className="hidden md:table-cell">{shift.crewChief.name}</TableCell>
                    <TableCell>
                       <Link href={user.role === 'Employee' || shift.timesheetStatus === 'Pending Finalization' ? `/shifts/${shift.id}` : `/timesheets/${shift.timesheetId}/approve`} onClick={(e) => e.stopPropagation()}>
                          <Badge variant={getTimesheetStatusVariant(shift.timesheetStatus)} className="cursor-pointer hover:opacity-90">{shift.timesheetStatus}</Badge>
                        </Link>
                    </TableCell>
                    {user.role !== 'Employee' && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>Edit Shift</DropdownMenuItem>
                            {user.role === 'Manager/Admin' && <DropdownMenuItem className="text-destructive">Cancel Shift</DropdownMenuItem>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
