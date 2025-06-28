
"use client"

import { useMemo } from "react"
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
import { useUser } from "@/hooks/use-user"
import { useShifts, useAnnouncements, useJobs } from "@/hooks/use-api"
import Link from 'next/link'
import { ArrowRight, CheckCircle, FileClock, CalendarDays, PlusCircle, Briefcase } from 'lucide-react'
import { format } from 'date-fns'
import { generateShiftUrl } from "@/lib/url-utils"
import { useRouter } from 'next/navigation'
import type { TimesheetStatus } from "@/lib/types"

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const { data: shiftsData, loading } = useShifts();
  const { data: announcementsData } = useAnnouncements();
  const { data: jobsData, loading: jobsLoading } = useJobs();

  const shiftsForUser = useMemo(() => {
    if (!shiftsData?.shifts) return [];
    return shiftsData.shifts;
  }, [shiftsData]);

  const upcomingShifts = shiftsForUser.filter(shift => new Date(shift.date) >= new Date()).slice(0, 3);

  // Recent jobs logic
  const recentJobs = useMemo(() => {
    if (!jobsData?.jobs || !shiftsData?.shifts) return [];

    // Get jobs with their most recent shift activity
    const jobsWithActivity = jobsData.jobs.map(job => {
      const jobShifts = shiftsData.shifts.filter(shift => shift.jobId === job.id);
      const mostRecentShift = jobShifts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      return {
        ...job,
        shiftCount: jobShifts.length,
        lastActivity: mostRecentShift?.date || job.createdAt || new Date().toISOString(),
        lastActivityType: mostRecentShift ? 'shift' : 'created'
      };
    });

    // Sort by most recent activity and take top 5
    return jobsWithActivity
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
      .slice(0, 5);
  }, [jobsData, shiftsData]);

  // For now, we'll hide the team members section since we don't have an employees API yet
  const teamMembers: any[] = [];

  const handleShiftClick = (shift: any) => {
    if (shift.clientName && shift.jobName) {
      const shiftUrl = generateShiftUrl(shift.clientName, shift.jobName, shift.date, shift.startTime, 1);
      router.push(shiftUrl);
    }
  };

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
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>My Upcoming Shifts</CardTitle>
              <CardDescription>
                Your next scheduled shifts.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/shifts">View All Shifts <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Loading shifts...</div>
              </div>
            ) : (
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
                {upcomingShifts.map((shift) => {
                    return (
                      <TableRow
                        key={shift.id}
                        onClick={() => handleShiftClick(shift)}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <TableCell>
                          <div className="font-medium">{format(new Date(shift.date), 'EEE, MMM d')}</div>
                        </TableCell>
                        <TableCell>{shift.clientName || 'N/A'}</TableCell>
                        <TableCell className="hidden md:table-cell">{shift.startTime} - {shift.endTime}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={getTimesheetStatusVariant(shift.timesheetStatus)} className="pointer-events-none">{shift.timesheetStatus}</Badge>
                        </TableCell>
                      </TableRow>
                    )
                })}
                {upcomingShifts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No upcoming shifts scheduled
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>

        {(user?.role === 'Manager/Admin') && (
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Jobs</CardTitle>
                <CardDescription>
                  Recently active jobs and projects.
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/jobs">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading jobs...</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job Name</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="hidden md:table-cell">Shifts</TableHead>
                      <TableHead className="text-right">Last Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentJobs.map((job) => (
                      <TableRow
                        key={job.id}
                        onClick={() => router.push(`/jobs/${job.id}`)}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                            <div className="font-medium">{job.name}</div>
                          </div>
                        </TableCell>
                        <TableCell>{job.clientName || 'N/A'}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline">{job.shiftCount}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(job.lastActivity), 'MMM d')}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {recentJobs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No recent jobs found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks at your fingertips.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
             { (user?.role === 'Employee' || user?.role === 'Crew Chief' || user?.role === 'Client') && (
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/shifts?status=Completed"><CheckCircle className="mr-2 h-4 w-4" /> View Completed Shifts</Link>
              </Button>
            )}
            { user?.role === 'Manager/Admin' && (
              <>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/timesheets"><FileClock className="mr-2 h-4 w-4" /> Pending Timesheets</Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link href="/jobs"><CalendarDays className="mr-2 h-4 w-4" /> Active Jobs</Link>
                </Button>
              </>
            )}
            { user?.role === 'Manager/Admin' && (
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/admin/jobs/new"><PlusCircle className="mr-2 h-4 w-4" /> Create New Job</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {user?.role !== 'Employee' && user?.role !== 'Client' && (
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

        <Card className={(user?.role === 'Employee' || user?.role === 'Client') ? 'lg:col-span-2' : ''}>
          <CardHeader>
            <CardTitle>Company Announcements</CardTitle>
            <CardDescription>Latest news and updates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(announcementsData?.announcements || []).map((announcement) => (
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
