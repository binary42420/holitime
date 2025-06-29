"use client"

import Link from "next/link"
import { useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@/hooks/use-user"
import { useTimesheets } from "@/hooks/use-api"
import { format } from "date-fns"
import type { Timesheet, TimesheetStatus } from "@/lib/types"
import { ArrowRight, Check, FileSignature, VenetianMask } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function TimesheetsPage() {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const { data: timesheetsData, loading, error, refetch } = useTimesheets();

  const handleApproveTimesheet = async (timesheetId: string) => {
    try {
      const response = await fetch(`/api/timesheets/${timesheetId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'approve' }),
      })

      if (!response.ok) {
        throw new Error('Failed to approve timesheet')
      }

      toast({
        title: "Timesheet Approved",
        description: "The timesheet has been approved successfully.",
      })

      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve timesheet. Please try again.",
        variant: "destructive",
      })
    }
  };

  useEffect(() => {
    if (user?.role === 'Employee') {
      router.push('/dashboard');
    }
  }, [user?.role, router]);

  const timesheetsToDisplay = useMemo(() => {
    if (!timesheetsData?.timesheets) return [];
    return timesheetsData.timesheets;
  }, [timesheetsData]);

  if (user?.role === 'Employee') {
    return null; // Render nothing while redirecting
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading timesheets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-destructive">Error loading timesheets: {error}</div>
      </div>
    );
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

  const renderAction = (timesheet: any) => {
    if (!timesheet.shift) return null;

    if (user?.role === 'Manager/Admin') {
      if (timesheet.status === 'Awaiting Manager Approval') {
        return <Button size="sm" onClick={() => handleApproveTimesheet(timesheet.id)}><Check className="mr-2 h-4 w-4" />Approve</Button>
      }
      if (timesheet.status === 'Awaiting Client Approval') {
        return <Button size="sm" asChild><Link href={`/timesheets/${timesheet.id}/approve`}><FileSignature className="mr-2 h-4 w-4" />Collect Signature</Link></Button>
      }
    }

    if (user?.role === 'Crew Chief' && timesheet.status === 'Awaiting Client Approval') {
       return <Button size="sm" asChild><Link href={`/timesheets/${timesheet.id}/approve`}><FileSignature className="mr-2 h-4 w-4" />Collect Signature</Link></Button>
    }
    
    // This is a demo feature allowing client view without separate login
    if (user?.role === 'Manager/Admin' && timesheet.status === 'Approved') {
        return <Button size="sm" variant="outline" asChild><Link href={`/timesheets/${timesheet.id}/approve`}><VenetianMask className="mr-2 h-4 w-4" />View as Client</Link></Button>
    }

    return (
        <Button size="sm" variant="outline" asChild>
            <Link href={`/shifts/${timesheet.shift.id}`}>View Shift <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
    )
  }

  const tabs: TimesheetStatus[] = ['Awaiting Client Approval', 'Awaiting Manager Approval', 'Approved', 'Pending Finalization'];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Timesheets</h1>
      </div>
      <Tabs defaultValue="Awaiting Client Approval">
        <TabsList className="grid w-full grid-cols-4">
          {tabs.map(tab => <TabsTrigger key={tab} value={tab}>{tab}</TabsTrigger>)}
        </TabsList>
        {tabs.map(status => (
            <TabsContent key={status} value={status}>
                <Card>
                    <CardHeader>
                        <CardTitle>{status}</CardTitle>
                        <CardDescription>
                            Shifts with timesheets currently in this state.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Client</TableHead>
                                <TableHead>Shift Date</TableHead>
                                <TableHead className="hidden md:table-cell">Crew Chief</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {timesheetsToDisplay.filter(t => t.status === status).map(timesheet => (
                                    <TableRow key={timesheet.id}>
                                        <TableCell className="font-medium">{timesheet.shift.clientName}</TableCell>
                                        <TableCell>{format(new Date(timesheet.shift.date), 'EEE, MMM d, yyyy')}</TableCell>
                                        <TableCell className="hidden md:table-cell">{timesheet.shift.crewChiefName}</TableCell>
                                        <TableCell className="text-right">{renderAction(timesheet)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
