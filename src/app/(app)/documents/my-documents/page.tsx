"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  XCircle,
  Edit,
  Download,
  Eye,
  Upload,
  Calendar,
  User,
  BarChart3
} from "lucide-react"
import Link from "next/link"
import { DocumentAssignment, DocumentStatus } from "@/types/documents"
import { useToast } from "@/hooks/use-toast"

interface DocumentProgress {
  total: number
  completed: number
  pending: number
  overdue: number
  compliance_rate: number
}

export default function MyDocumentsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [assignments, setAssignments] = useState<DocumentAssignment[]>([])
  const [progress, setProgress] = useState<DocumentProgress>({
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
    compliance_rate: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    fetchMyDocuments()
  }, [])

  const fetchMyDocuments = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/documents/assignments")
      if (!response.ok) throw new Error("Failed to fetch documents")
      
      const data = await response.json()
      setAssignments(data.assignments || [])
      
      // Calculate progress
      const total = data.assignments?.length || 0
      const completed = data.assignments?.filter((a: DocumentAssignment) => a.status === "approved").length || 0
      const pending = data.assignments?.filter((a: DocumentAssignment) => 
        ["not_started", "in_progress", "under_review"].includes(a.status)
      ).length || 0
      const overdue = data.assignments?.filter((a: DocumentAssignment) => 
        a.due_date && new Date(a.due_date) < new Date() && a.status !== "approved"
      ).length || 0
      
      setProgress({
        total,
        completed,
        pending,
        overdue,
        compliance_rate: total > 0 ? Math.round((completed / total) * 100) : 0
      })
    } catch (error) {
      console.error("Error fetching documents:", error)
      toast({
        title: "Error",
        description: "Failed to load your documents",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: DocumentStatus) => {
    switch (status) {
    case "approved":
      return <CheckCircle className="h-5 w-5 text-green-500" />
    case "completed":
    case "under_review":
      return <Clock className="h-5 w-5 text-blue-500" />
    case "in_progress":
      return <Edit className="h-5 w-5 text-yellow-500" />
    case "rejected":
      return <XCircle className="h-5 w-5 text-red-500" />
    case "expired":
      return <AlertTriangle className="h-5 w-5 text-orange-500" />
    default:
      return <FileText className="h-5 w-5 text-gray-500" />
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

  const getStatusMessage = (status: DocumentStatus) => {
    switch (status) {
    case "not_started":
      return "Ready to start"
    case "in_progress":
      return "Continue filling out"
    case "completed":
      return "Submitted for review"
    case "under_review":
      return "Being reviewed"
    case "approved":
      return "Approved and complete"
    case "rejected":
      return "Needs revision"
    case "expired":
      return "Document expired"
    default:
      return "Unknown status"
    }
  }

  const getFilteredAssignments = (filter: string) => {
    switch (filter) {
    case "pending":
      return assignments.filter(a => ["not_started", "in_progress", "under_review"].includes(a.status))
    case "completed":
      return assignments.filter(a => a.status === "approved")
    case "overdue":
      return assignments.filter(a => 
        a.due_date && new Date(a.due_date) < new Date() && a.status !== "approved"
      )
    case "action_required":
      return assignments.filter(a => ["not_started", "rejected"].includes(a.status))
    default:
      return assignments
    }
  }

  const filteredAssignments = getFilteredAssignments(activeTab)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Documents</h1>
          <p className="text-muted-foreground">
            Complete your required documents and track your progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <User className="h-4 w-4 mr-1" />
            {session?.user?.name}
          </Badge>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{progress.completed}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{progress.pending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{progress.overdue}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress.compliance_rate}%</div>
            <Progress value={progress.compliance_rate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Document Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Document Assignments</CardTitle>
          <CardDescription>
            View and complete your assigned documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">
                All ({assignments.length})
              </TabsTrigger>
              <TabsTrigger value="action_required">
                Action Required ({getFilteredAssignments("action_required").length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({getFilteredAssignments("pending").length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({getFilteredAssignments("completed").length})
              </TabsTrigger>
              <TabsTrigger value="overdue">
                Overdue ({getFilteredAssignments("overdue").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading documents...</p>
                  </div>
                ) : filteredAssignments.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No documents found in this category</p>
                  </div>
                ) : (
                  filteredAssignments.map((assignment) => (
                    <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            {getStatusIcon(assignment.status)}
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold">{assignment.template?.name}</h3>
                              <p className="text-sm text-muted-foreground mb-2">
                                {assignment.template?.description || `${assignment.template?.document_type} document`}
                              </p>
                              
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                {assignment.due_date && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    Due: {new Date(assignment.due_date).toLocaleDateString()}
                                  </div>
                                )}
                                {assignment.is_required && (
                                  <Badge variant="destructive" className="text-xs">Required</Badge>
                                )}
                                {assignment.priority !== "normal" && (
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {assignment.priority} Priority
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <Badge className={getStatusColor(assignment.status)}>
                                {assignment.status.replace("_", " ")}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {getStatusMessage(assignment.status)}
                              </p>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                              {assignment.status === "not_started" || assignment.status === "in_progress" || assignment.status === "rejected" ? (
                                <Link href={`/documents/fill/${assignment.id}`}>
                                  <Button size="sm">
                                    <Edit className="h-4 w-4 mr-1" />
                                    {assignment.status === "not_started" ? "Start" : "Continue"}
                                  </Button>
                                </Link>
                              ) : (
                                <Link href={`/documents/assignments/${assignment.id}`}>
                                  <Button variant="outline" size="sm">
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                </Link>
                              )}
                              
                              {assignment.status === "approved" && assignment.submission?.file_path && (
                                <Button variant="outline" size="sm">
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
