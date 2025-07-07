'use client';

import { useUser } from '@/hooks/use-user';
import { useApi } from '@/hooks/use-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Briefcase, Building2 } from 'lucide-react';

export default function ManagerDashboard() {
  const { user } = useUser();
  const router = useRouter();

  const { data: clientsData, loading: clientsLoading, error: clientsError, refetch: refetchClients } = useApi<{ clients: any[] }>('/api/clients');
  const { data: jobsData, loading: jobsLoading, error: jobsError, refetch: refetchJobs } = useApi<{ jobs: any[] }>('/api/jobs');
  const { data: shiftsData, loading: shiftsLoading, error: shiftsError, refetch: refetchShifts } = useApi<{ shifts: any[] }>('/api/shifts?filter=all');

  useEffect(() => {
    refetchClients();
    refetchJobs();
    refetchShifts();
  }, []);

  if (clientsLoading || jobsLoading || shiftsLoading) {
    return <div className="p-6 text-center">Loading dashboard data...</div>;
  }

  if (clientsError || jobsError || shiftsError) {
    return <div className="p-6 text-center text-red-600">Error loading dashboard data.</div>;
  }

  const clients = clientsData?.clients || [];
  const jobs = jobsData?.jobs || [];
  const shifts = shiftsData?.shifts || [];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold">Welcome, {user?.name}!</h1>
        <p className="text-muted-foreground">Manager Dashboard Overview</p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shifts.length}</div>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Recent Shifts</h2>
        {shifts.length > 0 ? (
          <div className="space-y-4">
            {shifts.slice(0, 5).map((shift) => (
              <Card key={shift.id} onClick={() => router.push(`/app/shifts/${shift.id}`)} className="cursor-pointer hover:bg-muted/50">
                <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div className="flex-grow mb-4 sm:mb-0">
                    <p className="font-semibold">{shift.jobName}</p>
                    <p className="text-sm text-muted-foreground">{shift.clientName}</p>
                    <p className="text-sm text-muted-foreground">{new Date(shift.date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge variant={shift.status === 'Completed' ? 'default' : 'secondary'}>
                      {shift.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p>No recent shifts found.</p>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mt-8 mb-4">Recent Clients</h2>
        {clients.length > 0 ? (
          <div className="space-y-4">
            {clients.slice(0, 5).map((client) => (
              <Card key={client.id} onClick={() => router.push(`/clients/${client.id}`)} className="cursor-pointer hover:bg-muted/50">
                <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div className="flex-grow mb-4 sm:mb-0">
                    <p className="font-semibold">{client.companyName || client.name}</p>
                    <p className="text-sm text-muted-foreground">{client.contactPerson}</p>
                    <p className="text-sm text-muted-foreground">{client.contactEmail}</p>
                  </div>
                  <Button size="sm" variant="outline">View</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p>No recent clients found.</p>
        )}
      </section>
    </div>
  );
}
