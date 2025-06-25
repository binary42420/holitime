
"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Download, Edit, FileCheck, Upload, CircleAlert, CheckCircle, FileClock } from "lucide-react"
import { useUser } from "@/hooks/use-user"
import { mockDocuments, mockEmployees } from "@/lib/mock-data"
import { Badge } from "@/components/ui/badge"
import type { AppDocument, DocumentStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function DocumentsPage() {
  const { user } = useUser()
  const [documents, setDocuments] = useState<AppDocument[]>(mockDocuments)
  const canManage = user.role === 'Manager/Admin'

  // This simulates a "submission" action. In a real app, this would involve an API call.
  const handleSignDocument = (docId: string) => {
    setDocuments(docs => docs.map(doc => 
      doc.id === docId ? { ...doc, status: 'Submitted' } : doc
    ))
  }

  const getStatusVariant = (status: DocumentStatus | undefined) => {
    if (!status) return 'outline'
    switch (status) {
      case 'Approved':
        return 'default'
      case 'Submitted':
        return 'secondary'
      case 'Pending Submission':
        return 'destructive'
      case 'Rejected':
        return 'destructive'
      default:
        return 'outline'
    }
  }
  
  const getStatusIcon = (status: DocumentStatus | undefined) => {
    if (!status) return null;
    switch (status) {
        case 'Approved': return <CheckCircle className="mr-2 h-4 w-4 text-green-600" />;
        case 'Submitted': return <FileCheck className="mr-2 h-4 w-4 text-blue-600" />;
        case 'Pending Submission': return <CircleAlert className="mr-2 h-4 w-4 text-yellow-600" />;
        case 'Rejected': return <CircleAlert className="mr-2 h-4 w-4 text-red-600" />;
        default: return null;
    }
  }
  
  const getActionForDocument = (doc: AppDocument) => {
      if (doc.status === 'Pending Submission') {
          return (
              <Button size="sm" onClick={() => handleSignDocument(doc.id)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Fill & Sign
              </Button>
          )
      }
      if (doc.status === 'Submitted' || doc.status === 'Approved' || doc.status === 'Rejected') {
           return (
              <Button size="sm" variant="outline" disabled>
                 {doc.status === 'Submitted' && <FileClock className="mr-2 h-4 w-4" />}
                 {doc.status === 'Approved' && <CheckCircle className="mr-2 h-4 w-4" />}
                 {doc.status === 'Rejected' && <CircleAlert className="mr-2 h-4 w-4" />}
                 {doc.status}
              </Button>
          )
      }
      return (
           <Button variant="outline" size="sm" asChild>
                <a href={doc.url} download><Download className="mr-2 h-4 w-4" /> Download</a>
            </Button>
      )
  }

  // Filter documents for the logged-in user
  const myDocs = documents.filter(doc => doc.assigneeId === user.id && !doc.isTemplate)
  // Admin-view documents
  const employeeDocs = documents.filter(doc => doc.category === 'Employee' && !doc.isTemplate)
  const clientDocs = documents.filter(doc => doc.category === 'Client' && !doc.isTemplate)
  const templates = documents.filter(doc => doc.isTemplate)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-headline">Documents</h1>
        {canManage && (
          <Button size="sm" className="gap-1">
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
        )}
      </div>

      <Tabs defaultValue="my-documents">
        <TabsList className={cn("grid w-full", canManage ? "grid-cols-4" : "grid-cols-1")}>
          <TabsTrigger value="my-documents">My Documents</TabsTrigger>
          {canManage && <TabsTrigger value="employee">All Employee Docs</TabsTrigger>}
          {canManage && <TabsTrigger value="client">Client Docs</TabsTrigger>}
          {canManage && <TabsTrigger value="templates">Templates</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="my-documents">
          <Card>
            <CardHeader>
              <CardTitle>My Documents</CardTitle>
              <CardDescription>
                Required documents and personal uploads. Please complete all pending items.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myDocs.length > 0 ? myDocs.map(doc => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>
                          <Badge variant={getStatusVariant(doc.status)} className="flex items-center w-fit">
                            {getStatusIcon(doc.status)}
                            {doc.status || 'N/A'}
                          </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                         {getActionForDocument(doc)}
                      </TableCell>
                    </TableRow>
                  )) : (
                     <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                            You have no assigned documents.
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {canManage && (
          <TabsContent value="employee">
            <Card>
              <CardHeader>
                <CardTitle>All Employee Documents</CardTitle>
                <CardDescription>
                  Manage certifications, submitted forms, and other employee-related files.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Name</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeDocs.map(doc => {
                        const employee = mockEmployees.find(e => e.id === doc.assigneeId)
                        return (
                          <TableRow key={doc.id}>
                              <TableCell className="font-medium">{doc.name}</TableCell>
                              <TableCell>{employee?.name || 'N/A'}</TableCell>
                              <TableCell>
                                  {doc.status && <Badge variant={getStatusVariant(doc.status)}>{doc.status}</Badge>}
                              </TableCell>
                              <TableCell className="text-right">
                                  <Button variant="outline" size="sm" asChild>
                                  <a href={doc.url} download><Download className="mr-2 h-4 w-4" /> Download</a>
                                  </Button>
                              </TableCell>
                          </TableRow>
                        )
                      })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canManage && (
          <TabsContent value="client">
             <Card>
              <CardHeader>
                <CardTitle>Client Documents</CardTitle>
                <CardDescription>
                  Manage contracts, insurance documents, and other client-related files.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden md:table-cell">Upload Date</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientDocs.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                         <TableCell><Badge variant="outline">{doc.type}</Badge></TableCell>
                        <TableCell className="hidden md:table-cell">{doc.uploadDate}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild>
                            <a href={doc.url} download><Download className="mr-2 h-4 w-4" /> Download</a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canManage && (
          <TabsContent value="templates">
             <Card>
              <CardHeader>
                <CardTitle>Document Templates</CardTitle>
                <CardDescription>
                  Manage templates for new hire packets, contracts, and policies.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map(doc => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                         <TableCell><Badge variant="outline">{doc.type}</Badge></TableCell>
                        <TableCell className="text-right">
                           <Button variant="outline" size="sm">
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
