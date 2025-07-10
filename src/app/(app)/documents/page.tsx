"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { useUser } from "@/hooks/use-user"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from '@mantine/core'
import { Input } from '@mantine/core'
import { Badge } from '@mantine/core'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  FileText,
  Download,
  Eye,
  Upload,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  FileCheck,
  FilePenLine,
  FileImage,
  FileSpreadsheet,
  Folder,
  Clock,
  User,
  PenTool
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function DocumentsPage() {
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()

  const documents = [
    {
      id: "1",
      name: "Safety Training Certificate",
      description: "Required safety training documentation",
      category: "Training",
      type: "PDF",
      status: "Active",
      updatedAt: "2024-01-15T10:00:00Z",
      ownerName: "John Smith"
    },
    {
      id: "2",
      name: "Equipment Inspection Form",
      description: "Daily equipment safety checklist",
      category: "Safety",
      type: "Form",
      status: "Requires Signature",
      updatedAt: "2024-01-14T15:30:00Z",
      ownerName: "Maria Garcia"
    },
    {
      id: "3",
      name: "Project Specifications",
      description: "Technical requirements and specifications",
      category: "Project",
      type: "PDF",
      status: "Active",
      updatedAt: "2024-01-13T09:15:00Z",
      ownerName: "Sam Chen"
    },
    {
      id: "4",
      name: "Time Sheet Template",
      description: "Standard timesheet template for workers",
      category: "Template",
      type: "Form",
      status: "Active",
      updatedAt: "2024-01-10T12:00:00Z",
      ownerName: "Admin"
    }
  ]

  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  const canManage = user?.role === 'Manager/Admin'

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch =
      doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.category?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter
    const matchesType = typeFilter === 'all' || doc.type === typeFilter

    return matchesSearch && matchesCategory && matchesStatus && matchesType
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge variant="default"><FileCheck className="mr-1 h-3 w-3" />Active</Badge>
      case 'Draft':
        return <Badge variant="secondary"><FilePenLine className="mr-1 h-3 w-3" />Draft</Badge>
      case 'Pending Review':
        return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />Pending Review</Badge>
      case 'Requires Signature':
        return <Badge variant="destructive"><PenTool className="mr-1 h-3 w-3" />Needs Signature</Badge>
      case 'Archived':
        return <Badge variant="outline">Archived</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-600" />
      case 'image':
        return <FileImage className="h-4 w-4 text-green-600" />
      case 'spreadsheet':
        return <FileSpreadsheet className="h-4 w-4 text-green-600" />
      case 'form':
        return <FilePenLine className="h-4 w-4 text-blue-600" />
      default:
        return <FileText className="h-4 w-4 text-gray-600" />
    }
  }

  const uniqueCategories = [...new Set(documents.map(d => d.category))].filter(Boolean)
  const uniqueTypes = [...new Set(documents.map(d => d.type))].filter(Boolean)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Documents</h1>
          <p className="text-muted-foreground">
            Manage and access important documents, forms, and files
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <>
              <Button variant="outline" onClick={() => router.push('/documents/templates')}>
                <Folder className="mr-2 h-4 w-4" />
                Templates
              </Button>
              <Button onClick={() => router.push('/documents/upload')}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </>
          )}
        </div>
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Pending Review">Pending Review</SelectItem>
                <SelectItem value="Requires Signature">Requires Signature</SelectItem>
                <SelectItem value="Archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("")
                setCategoryFilter("all")
                setStatusFilter("all")
                setTypeFilter("all")
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            All Documents
          </CardTitle>
          <CardDescription>
            {filteredDocuments.length} of {documents.length} documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => (
                <TableRow
                  key={doc.id}
                  onClick={() => router.push(`/documents/${doc.id}`)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {getTypeIcon(doc.type)}
                      <div>
                        <div className="font-medium">{doc.name}</div>
                        {doc.description && (
                          <div className="text-sm text-muted-foreground">{doc.description}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{doc.category}</Badge>
                  </TableCell>
                  <TableCell className="capitalize">{doc.type}</TableCell>
                  <TableCell>{getStatusBadge(doc.status)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {doc.updatedAt ? format(new Date(doc.updatedAt), 'MMM d, yyyy') : 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{doc.ownerName || 'Unknown'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(`/documents/${doc.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Document
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/documents/${doc.id}/edit`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit/Fill Form
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        {canManage && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Document
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
