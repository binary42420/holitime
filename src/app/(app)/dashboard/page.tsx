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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { mockShifts, mockAnnouncements, mockEmployees } from "@/lib/mock-data"
import { useUser } from "@/hooks/use-user"
import Link from 'next/link'
import { ArrowRight, CheckCircle, Clock, FilePlus, UserPlus } from 'lucide-react'
import { format } from 'date-fns'
import type { TimesheetStatus } from "@/lib/types"

export default function DashboardPage() {
  const { user } = useUser();
  const upcomingShifts = mockShifts.filter(shift => new Date(shift.date) >= new Date()).slice(0, 3);
  const teamMembers = mockEmployees.slice(0, 5);

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
        <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>My Upcoming Shifts</CardTitle>
              <CardDescription>
                Your next scheduled shifts.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/shifts">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Time</TableHead>
                  <TableHead className="text-right">Timesheet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingShifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell>
                      <Link href={`/shifts/${shift.id}`} className="font-medium hover:underline">{format(new Date(shift.date), 'EEE, MMM d')}</Link>
                    </TableCell>
                    <TableCell>{shift.client.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{shift.startTime} - {shift.endTime}</TableCell>
                    <TableCell className="text-right">
                       <Badge variant={getTimesheetStatusVariant(shift.timesheetStatus)}>{shift.timesheetStatus}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks at your fingertips.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Button variant="default" className="w-full justify-start">
              <Clock className="mr-2 h-4 w-4" /> Clock In / Out
            </Button>
            {user.role !== 'Employee' && (
              <Button variant="outline" className="w-full justify-start">
                <UserPlus className="mr-2 h-4 w-4" /> Add Crew to Shift
              </Button>
            )}
             <Button variant="outline" className="w-full justify-start">
              <FilePlus className="mr-2 h-4 w-4" /> Submit Timesheet
            </Button>
          </CardContent>
        </Card>

        {user.role !== 'Employee' && (
          <Card>
            <CardHeader>
              <CardTitle>Team Overview</CardTitle>
              <CardDescription>Your crew members' status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {teamMembers.map(member => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.avatar} alt={member.name} data-ai-hint="person portrait" />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.location}</p>
                    </div>
                  </div>
                  <Badge variant={member.performance > 4.5 ? 'default' : 'outline'} className={member.performance > 4.5 ? 'bg-green-500/20 text-green-700 border-green-500/30' : ''}>
                    {member.performance > 4.5 ? 'Available' : 'On Shift'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card className={user.role === 'Employee' ? 'lg:col-span-2' : ''}>
          <CardHeader>
            <CardTitle>Company Announcements</CardTitle>
            <CardDescription>Latest news and updates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockAnnouncements.map((announcement) => (
              <div key={announcement.id} className="flex items-start gap-4">
                <CheckCircle className="h-5 w-5 text-primary mt-1" />
                <div>
                  <p className="font-semibold">{announcement.title}</p>
                  <p className="text-sm text-muted-foreground">{announcement.content}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
