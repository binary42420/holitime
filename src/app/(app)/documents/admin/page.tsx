"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  FileText, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  XCircle,
  Search,
  Filter,
  Plus,
  Settings,
  BarChart3,
  Download,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Mail,
  UserPlus,
  Calendar
} from "lucide-react"
import Link from "next/link"
import { DocumentAssignment, DocumentStatus, Priority, DocumentComplianceReport } from "@/types/documents"
import { useToast } from "@/hooks/use-toast"

export default function DocumentAdminPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [assignments, setAssignments] = useState<DocumentAssignment[]>([])
  const [complianceReport, setComplianceReport] = useState<DocumentComplianceReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "all">("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    fetchAdminData()
  }, [statusFilter, roleFilter, searchTerm])

  const fetchAdminData = async () => {
    try {
      setLoading(true)
      
      // Fetch assignments
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      if (roleFilter !== "all") {
        params.append("role", roleFilter)
      }
      if (searchTerm) {
        params.append("search", searchTerm)
      }

      const assignmentsResponse = await fetch(`/api/documents/assignments?${params}`)
      if (!assignmentsResponse.ok) throw new Error("Failed to fetch assignments")
      
      const assignmentsData = await assignmentsResponse.json()
      setAssignments(assignmentsData.assignments || [])

      // Fetch compliance report
      const complianceResponse = await fetch("/api/documents/compliance-report")
      if (complianceResponse.ok) {
        const complianceData = await complianceResponse.json()
        setComplianceReport(complianceData)
      }
    } catch (error) {
      console.error("Error fetching admin data:", error)
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBulkAssign = async () => {
    // TODO: Implement bulk assignment dialog
    toast({
      title: "Feature Coming Soon",
      description: "Bulk assignment feature will be available soon"
    })
  }

  const handleSendReminder = async (assignmentId: number) => {
    try {
      const response = await fetch(`/api/documents/assignments/${assignmentId}/remind`, {
        method: "POST"
      })

      if (!response.ok) throw new Error("Failed to send reminder")

      toast({
        title: "Success",
        description: "Reminder email sent successfully"
      })
    } catch (error) {
      console.error("Error sending reminder:", error)
      toast({
        title: "Error",
        description: "Failed to send reminder",
        variant: "destructive"
      })
    }
  }

  const getStatusIcon = (status: DocumentStatus) => {
    switch (status) {
    case "approved":
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case "completed":
    case "under_review":
      return <Clock className="h-4 w-4 text-blue-500" />
    case "in_progress":
      return <Edit className="h-4 w-4 text-yellow-500" />
    case "rejected":
      return <XCircle className="h-4 w-4 text-red-500" />
    case "expired":
      return <AlertTriangle className="h-4 w-4 text-orange-500" />
    default:
      return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
    case "approved":
      return "bg-green-100 text-green-800"
    case "completed":
    case "under_review":
      return "bg-blue-100 text-blue-800"
    case "in_progress":
      return "bg-yellow-100 text-yellow-800"
    case "rejected":
      return "bg-red-100 text-red-800"
    case "expired":
      return "bg-orange-100 text-orange-800"
    default:
      return "bg-gray-100 text-gray-800"
    }
  }

  const isAdmin = session?.user?.role === "Manager/Admin"
  const isCrewChief = session?.user?.role === "Crew Chief"
  const canManageDocuments = isAdmin || isCrewChief

  if (!canManageDocuments) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You need administrator or crew chief privileges to access the admin panel.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Document Administration</h1>
          <p className="text-muted-foreground">
            Manage document assignments, compliance, and employee progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleBulkAssign}>
            <UserPlus className="h-4 w-4 mr-2" />
            Bulk Assign
          </Button>
          <Link href="/documents/templates">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Manage Templates
            </Button>
          </Link>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Compliance Overview */}
      {complianceReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{complianceReport.total_assignments}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{complianceReport.completed_assignments}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{complianceReport.pending_assignments}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{complianceReport.overdue_assignments}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(complianceReport.compliance_rate)}%</div>
              <Progress value={complianceReport.compliance_rate} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assignments">All Assignments</TabsTrigger>
          <TabsTrigger value="review_queue">Review Queue</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Report</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest document submissions and status changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assignments.slice(0, 10).map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(assignment.status)}
                      <div>
                        <p className="font-medium">{assignment.user?.name}</p>
                        <p className="text-sm text-muted-foreground">{assignment.template?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(assignment.status)}>
                        {assignment.status.replace("_", " ")}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(assignment.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Document Assignments</CardTitle>
              <CardDescription>
                Manage and monitor all document assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search assignments..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as DocumentStatus | "all")}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="Employee">Employee</SelectItem>
                    <SelectItem value="Crew Chief">Crew Chief</SelectItem>
                    <SelectItem value="Manager/Admin">Manager/Admin</SelectItem>
                    <SelectItem value="Client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assignments Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-muted-foreground">Loading assignments...</p>
                      </TableCell>
                    </TableRow>
                  ) : assignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No assignments found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{assignment.user?.name}</div>
                            <div className="text-sm text-muted-foreground">{assignment.user?.role}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{assignment.template?.name}</div>
                            <div className="text-sm text-muted-foreground">{assignment.template?.document_type}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(assignment.status)}>
                            {assignment.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {assignment.due_date ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {new Date(assignment.due_date).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No due date</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(assignment.assigned_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View Assignment
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSendReminder(assignment.id)}>
                                <Mail className="mr-2 h-4 w-4" />
                                Send Reminder
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Assignment
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Assignment
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review_queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Review Queue</CardTitle>
              <CardDescription>
                Documents pending review and approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Review queue functionality coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Report</CardTitle>
              <CardDescription>
                Detailed compliance metrics and reporting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Detailed compliance reporting coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
