'use client';

import { useUser } from '@/hooks/use-user';
import { useApi } from '@/hooks/use-api';
import type { Job, Shift, ClientCompany } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Briefcase } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ClientDashboard() {
  const { user } = useUser();
  const router = useRouter();

  const { data: shiftsData, loading: shiftsLoading } = useApi<{ shifts: Shift[] }>(
    `/api/shifts?clientId=${user?.clientCompanyId || ''}`
  );

  const { data: jobsData, loading: jobsLoading } = useApi<{ jobs: Job[] }>(
    `/api/clients/${user?.clientCompanyId || ''}/jobs`
  );

  if (shiftsLoading || jobsLoading) {
    return <div>Loading...</div>;
  }

  const shifts: Shift[] = shiftsData?.shifts || [];
  const jobs: Job[] = jobsData?.jobs || [];
  const upcomingShifts = shifts.filter((shift: Shift) => shift.status === 'Upcoming');
  const completedShifts = shifts.filter((shift: Shift) => shift.status === 'Completed');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome, {user?.name}!</h1>
          <p className="text-muted-foreground">{user?.companyName || ''}</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobs.filter((job: Job) => job.status === 'Active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Shifts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingShifts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Shifts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedShifts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.slice(0, 5).map((job: Job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{job.name}</p>
                    <p className="text-sm text-muted-foreground">{job.description}</p>
                  </div>
                  <Badge variant={job.status === 'Active' ? 'default' : 'secondary'}>
                    {job.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No jobs found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Shifts */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingShifts.length > 0 ? (
            <div className="space-y-4">
              {upcomingShifts.slice(0, 5).map((shift: Shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{shift.jobName}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(shift.date).toLocaleDateString()} {shift.startTime} - {shift.endTime}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {shift.assignedCount}/{shift.requestedWorkers} Workers
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No upcoming shifts</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
