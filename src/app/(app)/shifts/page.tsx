"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format, isToday, isTomorrow, isYesterday } from "date-fns"
import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CompanyLogoWithName } from "@/components/ui/company-logo"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Calendar as CalendarIcon,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  CheckCircle,
  UserCheck,
  UserX,
  AlertTriangle
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { generateShiftEditUrl } from "@/lib/url-utils"

type Shift = {
  id: string;
  jobId: string;
  date: string;
  startTime: string;
  endTime: string;
  jobName: string;
  clientName: string;
  location: string;
  crewChief: {
    id: string;
    name: string;
    avatar?: string;
  } | null;
  assignedPersonnel: { userId: string }[];
  assignedCount: number;
  requestedWorkers: number;
  status: string;
  client_company_id?: string;
  clientCompanyLogoUrl?: string;
  clientCompany?: {
    logoUrl?: string;
  }
};

type Tab = {
  id: string;
  label: string;
  roles: ('Employee' | 'Crew Chief' | 'Manager/Admin' | 'Client')[];
};

const TABS: Tab[] = [
  { id: 'my_shifts', label: 'My Shifts', roles: ['Employee', 'Crew Chief', 'Manager/Admin'] },
  { id: 'cc_shifts', label: 'My CC Shifts', roles: ['Crew Chief', 'Manager/Admin'] },
  { id: 'all_shifts', label: 'All Shifts', roles: ['Manager/Admin'] },
  { id: 'today', label: "Today's Shifts", roles: ['Client'] },
  { id: 'all_client_shifts', label: 'All Shifts', roles: ['Client'] },
];

export default function ShiftsPage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)

  const { data, loading, error } = useApi<{ shifts: Shift[] }>(
    user ? `/api/shifts?userId=${user.id}` : ''
  );
  
  const shifts = data?.shifts || []

  const userTabs = useMemo(() => {
    if (!user) return []
    return TABS.filter(tab => tab.roles.includes(user.role as any))
  }, [user])

  useEffect(() => {
    if (user && userTabs.length > 0 && !activeTab) {
      switch (user.role) {
        case 'Employee':
        case 'Crew Chief':
          setActiveTab('my_shifts')
          break
        case 'Manager/Admin':
          setActiveTab('all_shifts')
          break
        case 'Client':
          setActiveTab('today')
          break
        default:
          setActiveTab(userTabs[0].id)
      }
    }
  }, [user, userTabs, activeTab])

  const handleRowClick = (shiftId: string) => {
    router.push(`/shifts/${shiftId}`)
  }

  const filteredShifts = useMemo(() => {
    if (!user) return []

    let filtered = shifts;

    // Tab-based filtering
    switch (activeTab) {
      case 'my_shifts':
        filtered = shifts.filter(shift => 
          shift.assignedPersonnel?.some(p => p.userId === user.id)
        );
        break;
      case 'cc_shifts':
        filtered = shifts.filter(shift => shift.crewChief?.id === user.id);
        break;
      case 'all_shifts':
        // No additional filtering needed for admin
        break;
      case 'today':
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() -1);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() +1);
        filtered = shifts.filter(shift => {
          const shiftDate = new Date(shift.date);
          return shiftDate >= startOfToday && shiftDate <= endOfToday && shift.client_company_id === user.clientCompanyId;
        });
        break;
      case 'all_client_shifts':
        filtered = shifts.filter(shift => shift.client_company_id === user.clientCompanyId);
        break;
      default:
        break;
    }

    // Search and status filters
    return filtered.filter(shift => {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        shift.jobName?.toLowerCase().includes(searchLower) ||
        shift.clientName?.toLowerCase().includes(searchLower) ||
        shift.location?.toLowerCase().includes(searchLower)

      const matchesStatus = statusFilter === 'all' || shift.status === statusFilter

      return matchesSearch && matchesStatus
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  }, [shifts, activeTab, user, searchTerm, statusFilter])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Completed</Badge>
      case 'In Progress':
        return <Badge variant="destructive">In Progress</Badge>
      case 'Upcoming':
        return <Badge variant="secondary">Upcoming</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStaffingBadge = (assigned: number, requested: number) => {
    const percentage = requested > 0 ? (assigned / requested) * 100 : 100;
    if (percentage >= 100) {
      return <Badge variant="default" className="bg-green-600"><UserCheck className="mr-1 h-3 w-3" />Fully Staffed</Badge>
    } else if (percentage > 0) {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-700"><AlertTriangle className="mr-1 h-3 w-3" />Partially Staffed</Badge>
    } else {
      return <Badge variant="destructive"><UserX className="mr-1 h-3 w-3" />Unstaffed</Badge>
    }
  }

  const ShiftsTable = ({ shiftsToShow }: { shiftsToShow: Shift[] }) => (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Job & Client</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Crew Chief</TableHead>
              <TableHead>Staffing</TableHead>
              <TableHead>Status</TableHead>
              {user?.role === 'Manager/Admin' && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {shiftsToShow.length === 0 ? (
              <TableRow>
                <TableCell colSpan={user?.role === 'Manager/Admin' ? 7 : 6} className="h-24 text-center">
                  No shifts found for this view.
                </TableCell>
              </TableRow>
            ) : (
              shiftsToShow.map((shift) => (
                <TableRow
                  key={shift.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(shift.id)}
                >
                  <TableCell>
                    <div className="font-medium">
                      {format(new Date(shift.date), 'MMM d, yyyy')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {shift.startTime} - {shift.endTime}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Link href={`/jobs/${shift.jobId}`} className="hover:underline">
                        <p className="font-medium">{shift.jobName}</p>
                      </Link>
                      <Link href={`/clients/${shift.client_company_id}`} className="hover:underline">
                        <CompanyLogoWithName
                          companyName={shift.clientName}
                          logoUrl={shift.clientCompanyLogoUrl || shift.clientCompany?.logoUrl || null}
                          size="sm"
                          nameClassName="text-sm text-muted-foreground"
                          gap="xs"
                        />
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>{shift.location}</TableCell>
                  <TableCell>
                    {shift.crewChief ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={shift.crewChief.avatar} />
                          <AvatarFallback>{shift.crewChief.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{shift.crewChief.name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStaffingBadge(shift.assignedCount, shift.requestedWorkers)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(shift.status)}
                  </TableCell>
                  {user?.role === 'Manager/Admin' && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            router.push(generateShiftEditUrl(shift.id));
                          }}>
                            Edit Shift
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const SkeletonLoader = () => (
    <div className="space-y-4">
      <Skeleton className="h-10 w-1/4" />
      <Skeleton className="h-10 w-full" />
      <div className="border rounded-lg p-4">
        <Skeleton className="h-8 w-full mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 py-2">
            <Skeleton className="h-12 w-1/6" />
            <Skeleton className="h-12 w-1/6" />
            <Skeleton className="h-12 w-1/6" />
            <Skeleton className="h-12 w-1/6" />
            <Skeleton className="h-12 w-1/6" />
            <Skeleton className="h-12 w-1/6" />
          </div>
        ))}
      </div>
    </div>
  );

  if (loading || !user || !activeTab) {
    return <SkeletonLoader />;
  }

  if (error) {
    return <div className="text-destructive">Error loading shifts: {error.toString()}</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Shifts</h1>
          <p className="text-muted-foreground">
            View and manage shifts based on your role.
          </p>
        </div>
        {user?.role === 'Manager/Admin' && (
          <Button onClick={() => router.push('/admin/shifts/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Shift
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {userTabs.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-grow">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shifts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Upcoming">Upcoming</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {userTabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id}>
              <ShiftsTable shiftsToShow={filteredShifts} />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  )
}
