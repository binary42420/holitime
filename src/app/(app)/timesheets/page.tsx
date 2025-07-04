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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useUser } from "@/hooks/use-user"
import { useTimesheets } from "@/hooks/use-api"
import { format } from "date-fns"
import type { Timesheet, TimesheetStatus } from "@/lib/types"
import { ArrowRight, Check, FileSignature, VenetianMask, Download } from "lucide-react"
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

  const handleDownloadPDF = async (timesheetId: string, clientName: string, shiftDate: string) => {
    try {
      const response = await fetch(`/api/timesheets/${timesheetId}/pdf`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `timesheet-${clientName.replace(/\s+/g, '-')}-${shiftDate}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        toast({
          title: "Error",
          description: "Failed to download PDF",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast({
        title: "Error",
        description: "Failed to download PDF",
        variant: "destructive",
      })
    }
  }

  const renderAction = (timesheet: any) => {
    if (!timesheet.shift) return null;

    // Show PDF download for completed timesheets
    if (timesheet.status === 'completed' || timesheet.status === 'Approved') {
      return (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDownloadPDF(timesheet.id, timesheet.shift.clientName, timesheet.shift.date)}
          >
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/timesheets/${timesheet.id}`}>View</Link>
          </Button>
        </div>
      )
    }

    if (user?.role === 'Manager/Admin') {
      if (timesheet.status === 'pending_final_approval' || timesheet.status === 'Awaiting Manager Approval') {
        return <Button size="sm" asChild><Link href={`/timesheets/${timesheet.id}/manager-approval`}><Check className="mr-2 h-4 w-4" />Final Approval</Link></Button>
      }
      if (timesheet.status === 'pending_client_approval' || timesheet.status === 'Awaiting Client Approval') {
        return <Button size="sm" asChild><Link href={`/timesheets/${timesheet.id}/approve`}><FileSignature className="mr-2 h-4 w-4" />Client Approval</Link></Button>
      }
    }

    if (user?.role === 'Crew Chief' && (timesheet.status === 'pending_client_approval' || timesheet.status === 'Awaiting Client Approval')) {
       return <Button size="sm" asChild><Link href={`/timesheets/${timesheet.id}/approve`}><FileSignature className="mr-2 h-4 w-4" />Client Approval</Link></Button>
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

  const tabs = [
    { value: 'pending_client_approval', label: 'Client Approval' },
    { value: 'pending_final_approval', label: 'Manager Approval' },
    { value: 'completed', label: 'Completed' },
    { value: 'draft', label: 'Draft' }
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold font-headline">Timesheets</h1>
      </div>
      <Tabs defaultValue="pending_client_approval">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1">
          {tabs.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="text-xs md:text-sm px-2 md:px-3 py-2"
            >
              <span className="hidden md:inline">{tab.label}</span>
              <span className="md:hidden">
                {tab.label.split(' ')[0]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map(tab => (
            <TabsContent key={tab.value} value={tab.value}>
                <Card>
                    <CardHeader>
                        <CardTitle>{tab.label}</CardTitle>
                        <CardDescription>
                            Shifts with timesheets currently in this state.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Mobile: Card Layout */}
                        <div className="md:hidden space-y-3">
                          {timesheetsToDisplay.filter(t => t.status === tab.value).map(timesheet => (
                            <Card key={timesheet.id} className="card-mobile">
                              <CardContent className="pt-4">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h3 className="font-medium text-base">{timesheet.shift?.clientName}</h3>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(timesheet.shift?.date).toLocaleDateString()}
                                    </p>
                                    {timesheet.shift?.crewChief && (
                                      <p className="text-xs text-muted-foreground">
                                        Chief: {timesheet.shift.crewChief}
                                      </p>
                                    )}
                                  </div>
                                  <Badge variant={getTimesheetStatusVariant(timesheet.status)} className="text-xs">
                                    {timesheet.status.replace('_', ' ')}
                                  </Badge>
                                </div>
                                <div className="flex justify-end">
                                  {renderAction(timesheet)}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        {/* Desktop: Table Layout */}
                        <div className="hidden md:block">
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
                              {timesheetsToDisplay.filter(t => t.status === tab.value).map(timesheet => (
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
