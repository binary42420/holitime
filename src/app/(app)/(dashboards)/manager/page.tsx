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
    <div className="container mx-auto p-6 space-y-6">
      <header className="mb-6">
        <h1 className="text-4xl font-bold">Welcome, {user?.name}!</h1>
        <p className="text-muted-foreground">Manager Dashboard Overview</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Total Clients</CardTitle>
            <Building2 className="h-6 w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{clients.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Total Jobs</CardTitle>
            <Briefcase className="h-6 w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{jobs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Total Shifts</CardTitle>
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{shifts.length}</div>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Recent Shifts</h2>
        {shifts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">Date</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Job</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Client</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shifts.slice(0, 10).map((shift) => (
                  <tr key={shift.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="border border-gray-300 px-4 py-2">{new Date(shift.date).toLocaleDateString()}</td>
                    <td className="border border-gray-300 px-4 py-2">{shift.jobName}</td>
                    <td className="border border-gray-300 px-4 py-2">{shift.clientName}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <Badge variant={shift.status === 'Completed' ? 'default' : 'secondary'}>
                        {shift.status}
                      </Badge>
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <Button size="sm" variant="outline" onClick={() => router.push(`/shifts/${shift.id}`)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No recent shifts found.</p>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mt-8 mb-4">Recent Clients</h2>
        {clients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">Company Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Contact Person</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Email</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.slice(0, 10).map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="border border-gray-300 px-4 py-2">{client.companyName || client.name}</td>
                    <td className="border border-gray-300 px-4 py-2">{client.contactPerson}</td>
                    <td className="border border-gray-300 px-4 py-2">{client.contactEmail}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <Button size="sm" variant="outline" onClick={() => router.push(`/clients/${client.id}`)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No recent clients found.</p>
        )}
      </section>
    </div>
  );
}
