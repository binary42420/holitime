'use client';

import { useMobileApi } from '@/hooks/use-mobile-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clock, 
  MapPin, 
  Users, 
  Calendar,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

export function MobileDashboard() {
  const { data: todaysShifts, loading: shiftsLoading, error: shiftsError, refetch: refetchShifts } = useMobileApi<any[]>('/api/shifts/today');
  const { data: pendingTimesheets, loading: timesheetsLoading, refetch: refetchTimesheets } = useMobileApi<any[]>('/api/timesheets/pending');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchShifts(), refetchTimesheets()]);
    setRefreshing(false);
  };

  const handleClockAction = async (shiftId: string, assignmentId: string, action: 'clock_in' | 'clock_out') => {
    const originalShifts = todaysShifts ? [...todaysShifts] : [];
    
    // Optimistically update the UI
    if (todaysShifts) {
      const newShifts = todaysShifts.map(shift => {
        if (shift.id === shiftId) {
          return {
            ...shift,
            status: action === 'clock_in' ? 'active' : 'inactive',
          };
        }
        return shift;
      });
      // This is a hack to update the state without a setter from the hook
      // In a real app, the useMobileApi hook would return a state setter
      Object.assign(todaysShifts, newShifts);
    }

    try {
      // This would be implemented with the mobile API
      console.log(`${action} for shift ${shiftId}, assignment ${assignmentId}`);
      // No need to refresh, UI is already updated
    } catch (error) {
      console.error('Clock action failed:', error);
      // Restore the original shifts if the API call fails
      Object.assign(todaysShifts, originalShifts);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Today's Date */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <h2 className="text-lg font-semibold">{format(new Date(), 'EEEE, MMMM d, yyyy')}</h2>
            <p className="text-gray-600">Today's Schedule</p>
          </div>
        </CardContent>
      </Card>

      {/* Today's Shifts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Today's Shifts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {shiftsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : shiftsError ? (
            <div className="text-center py-4">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
              <p className="text-red-600">Failed to load shifts</p>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
                Try Again
              </Button>
            </div>
          ) : !todaysShifts || todaysShifts.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No shifts scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todaysShifts.map((shift) => (
                <div key={shift.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{shift.job?.title || 'Untitled Job'}</h3>
                      <p className="text-sm text-gray-600">{shift.client?.company_name}</p>
                    </div>
                    <Badge variant={shift.status === 'active' ? 'default' : 'secondary'}>
                      {shift.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-gray-400" />
                      <span>{shift.start_time} - {shift.end_time}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                      <span className="truncate">{shift.location || 'No location'}</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1 text-gray-400" />
                      <span>{shift.assigned_personnel?.length || 0} workers</span>
                    </div>
                  </div>

                  {/* Clock In/Out Actions */}
                  {shift.assigned_personnel && shift.assigned_personnel.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-600 mb-2">Quick Actions:</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleClockAction(shift.id, shift.assigned_personnel[0].id, 'clock_in')}
                        >
                          Clock In
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleClockAction(shift.id, shift.assigned_personnel[0].id, 'clock_out')}
                        >
                          Clock Out
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Timesheets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            Pending Timesheets
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timesheetsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : !pendingTimesheets || pendingTimesheets.length === 0 ? (
            <div className="text-center py-4">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-gray-600">No pending timesheets</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingTimesheets.slice(0, 3).map((timesheet) => (
                <div key={timesheet.id} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                  <div>
                    <p className="font-medium text-sm">{timesheet.employee_name}</p>
                    <p className="text-xs text-gray-600">{timesheet.shift_date}</p>
                  </div>
                  <Badge variant="outline">Pending</Badge>
                </div>
              ))}
              {pendingTimesheets.length > 3 && (
                <p className="text-xs text-gray-600 text-center pt-2">
                  +{pendingTimesheets.length - 3} more pending
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Connection Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600">Connected to API</span>
            </div>
            <p className="text-xs text-gray-500">
              {process.env.NEXT_PUBLIC_API_URL}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
