"use client"

import { useState } from "react"
import { useUser } from "@/hooks/use-user"
import { useApi } from "@/hooks/use-api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/(app)/components/ui/card"
import { Button } from "@/app/(app)/components/ui/button"
import { Badge } from "@/app/(app)/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/(app)/components/ui/table"
import { Input } from "@/app/(app)/components/ui/input"
import { Label } from "@/app/(app)/components/ui/label"
import { Textarea } from "@/app/(app)/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/(app)/components/ui/select"
import { PDFViewer } from "@/app/(app)/components/ui/pdf-viewer"
import { useToast } from "@/hooks/use-toast"
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Download,
  AlertCircle,
  Users,
  Filter
} from "lucide-react"
import type { Document, DocumentType } from "@/lib/types"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/(app)/components/ui/dialog"

export default function AdminDocumentsPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("pending_review")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  // Only managers can access this page
  const { data: documentsData, loading: documentsLoading, refetch: refetchDocuments } = useApi<{ documents: Document[] }>(
    user?.role === "Manager/Admin" ? `/api/documents?status=${statusFilter}&documentType=${typeFilter}` : null
  )

  const { data: documentTypesData } = useApi<{ documentTypes: DocumentType[] }>(
    user?.role === "Manager/Admin" ? "/api/document-types" : null
  )

  if (user?.role !== "Manager/Admin") {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to review documents.</p>
        </div>
      </div>
    )
  }

  const documents = documentsData?.documents || []
  const documentTypes = documentTypesData?.documentTypes || []

  const handleReview = async (documentId: string, action: "approve" | "reject") => {
    if (action === "reject" && !reviewNotes.trim()) {
      toast({
        title: "Review Notes Required",
        description: "Please provide a reason for rejecting this document.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/documents/${documentId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reviewNotes: reviewNotes.trim() || undefined
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Review failed")
      }

      toast({
        title: `Document ${action === "approve" ? "Approved" : "Rejected"}`,
        description: `The document has been ${action}d successfully.`,
      })

      setSelectedDocument(null)
      setReviewAction(null)
      setReviewNotes("")
      refetchDocuments()
    } catch (error) {
      console.error("Error reviewing document:", error)
      toast({
        title: "Review Failed",
        description: error instanceof Error ? error.message : "Failed to review document",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
    case "approved":
      return { color: "bg-green-100 text-green-800", icon: CheckCircle, label: "Approved" }
    case "pending_review":
      return { color: "bg-yellow-100 text-yellow-800", icon: Clock, label: "Pending Review" }
    case "rejected":
      return { color: "bg-red-100 text-red-800", icon: XCircle, label: "Rejected" }
    case "expired":
      return { color: "bg-gray-100 text-gray-800", icon: AlertCircle, label: "Expired" }
    default:
      return { color: "bg-gray-100 text-gray-800", icon: FileText, label: status }
    }
  }

  if (selectedDocument) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setSelectedDocument(null)}>
            ← Back to Documents
          </Button>
          <div>
            <h1 className="text-3xl font-bold font-headline">Review Document</h1>
            <p className="text-muted-foreground">{selectedDocument.originalFilename}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document Info */}
          <Card>
            <CardHeader>
              <CardTitle>Document Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Employee</Label>
                <p className="text-sm">{selectedDocument.user?.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Document Type</Label>
                <p className="text-sm">{selectedDocument.documentType?.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Uploaded</Label>
                <p className="text-sm">{format(new Date(selectedDocument.uploadedAt), "MMM d, yyyy h:mm a")}</p>
              </div>
              {selectedDocument.expirationDate && (
                <div>
                  <Label className="text-sm font-medium">Expires</Label>
                  <p className="text-sm">{format(new Date(selectedDocument.expirationDate), "MMM d, yyyy")}</p>
                </div>
              )}
              <div>
                <Label className="text-sm font-medium">File Size</Label>
                <p className="text-sm">{(selectedDocument.fileSize / 1024 / 1024).toFixed(2)} MB</p>
              </div>

              {/* Review Actions */}
              <div className="space-y-3 pt-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => setReviewAction("approve")}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Approve Document</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to approve this document? This will activate any associated certifications.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="approveNotes">Approval Notes (Optional)</Label>
                        <Textarea
                          id="approveNotes"
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Add any notes about this approval"
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => handleReview(selectedDocument.id, "approve")}
                        disabled={isProcessing}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isProcessing ? "Approving..." : "Approve Document"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={() => setReviewAction("reject")}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reject Document</DialogTitle>
                      <DialogDescription>
                        Please provide a reason for rejecting this document. The employee will be notified.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="rejectNotes">Rejection Reason *</Label>
                        <Textarea
                          id="rejectNotes"
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Explain why this document is being rejected"
                          rows={3}
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="destructive"
                        onClick={() => handleReview(selectedDocument.id, "reject")}
                        disabled={!reviewNotes.trim() || isProcessing}
                      >
                        {isProcessing ? "Rejecting..." : "Reject Document"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Document Viewer */}
          <div className="lg:col-span-2">
            <PDFViewer
              fileUrl={selectedDocument.filePath}
              filename={selectedDocument.originalFilename}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-headline">Document Review</h1>
        <p className="text-muted-foreground">
          Review and approve employee document submissions
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.filter(d => d.status === "pending_review").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.filter(d => 
                d.status === "approved" && 
                d.reviewedAt && 
                new Date(d.reviewedAt).toDateString() === new Date().toDateString()
              ).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(documents.map(d => d.userId)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="statusFilter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="typeFilter">Document Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            {documents.length === 0 
              ? "No documents match the current filters"
              : `${documents.length} document${documents.length === 1 ? "" : "s"} found`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading documents...</p>
              </div>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Documents Found</h3>
              <p className="text-muted-foreground">
                No documents match the current filter criteria.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Filename</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document) => {
                  const statusConfig = getStatusConfig(document.status)
                  const StatusIcon = statusConfig.icon

                  return (
                    <TableRow key={document.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{document.user?.name}</div>
                          <div className="text-sm text-muted-foreground">{document.user?.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{document.documentType?.name}</div>
                          {document.documentType?.isCertification && (
                            <Badge variant="outline" className="text-xs">Certification</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate" title={document.originalFilename}>
                          {document.originalFilename}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(document.uploadedAt), "MMM d, yyyy")}
                          <div className="text-muted-foreground">
                            {format(new Date(document.uploadedAt), "h:mm a")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedDocument(document)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Review
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
