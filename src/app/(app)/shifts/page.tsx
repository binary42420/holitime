"use client"

import Link from "next/link"
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
import { mockShifts } from "@/lib/mock-data"
import type { Shift } from "@/lib/types"
import { format } from "date-fns"

export default function ShiftsPage() {
  const { user } = useUser()

  const shiftsToDisplay = user.role === 'Employee' 
    ? mockShifts.filter(shift => shift.assignedPersonnel.some(p => p.employee.id === user.id))
    : mockShifts;

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Shifts</h1>
        {user.role !== 'Employee' && (
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="hidden md:table-cell">Time</TableHead>
                <TableHead className="hidden md:table-cell">Crew Chief</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shiftsToDisplay.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell className="font-medium">{shift.client.name}</TableCell>
                  <TableCell>{format(new Date(shift.date), 'EEE, MMM d')}</TableCell>
                  <TableCell className="hidden md:table-cell">{shift.startTime} - {shift.endTime}</TableCell>
                  <TableCell className="hidden md:table-cell">{shift.crewChief.name}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(shift.status)}>{shift.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild><Link href={`/shifts/${shift.id}`}>View Details</Link></DropdownMenuItem>
                        {user.role !== 'Employee' && <DropdownMenuItem>Edit Shift</DropdownMenuItem>}
                        {user.role === 'Manager/Admin' && <DropdownMenuItem className="text-destructive">Cancel Shift</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
