"use client"

import {
  Card,
  CardContent,
  CardDescription,
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useUser } from "@/hooks/use-user"
import { mockShifts } from "@/lib/mock-data"
import { notFound } from "next/navigation"
import { format } from 'date-fns'
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Building2, Calendar, Clock, MapPin, User, Pencil } from "lucide-react"
import Link from "next/link"

export default function ShiftDetailPage({ params }: { params: { id: string } }) {
  const { user } = useUser()
  const shift = mockShifts.find((s) => s.id === params.id)

  if (!shift) {
    notFound()
  }

  const canEdit = user.role === 'Crew Chief' || user.role === 'Manager/Admin'

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
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead className="text-right">Checked In</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shift.assignedPersonnel.map(({ employee, checkedIn, clockIn, clockOut }) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                           <Avatar className="h-9 w-9">
                            <AvatarImage src={employee.avatar} alt={employee.name} data-ai-hint="person face" />
                            <AvatarFallback>{employee.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{employee.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input type="time" defaultValue={clockIn} disabled={!canEdit} className="w-32" />
                      </TableCell>
                      <TableCell>
                        <Input type="time" defaultValue={clockOut} disabled={!canEdit} className="w-32" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch defaultChecked={checkedIn} disabled={!canEdit} aria-label={`${employee.name} check-in status`} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {canEdit && (
                <div className="flex justify-end mt-4">
                  <Button>Save Changes</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {canEdit && <Card>
            <CardHeader>
              <CardTitle>Shift Notes</CardTitle>
              <CardDescription>Add or update notes for this shift. Visible to the crew chief and manager.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea defaultValue={shift.notes} placeholder="Add any important notes for the shift..." />
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
                  <Badge variant="secondary">{shift.status}</Badge>
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
                  <Link href={`/clients/${shift.client.id}`} className="hover:underline">
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
