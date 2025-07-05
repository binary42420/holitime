"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { 
  FileSpreadsheet, 
  Plus, 
  Edit, 
  Trash2, 
  Settings,
  Star,
  Copy
} from "lucide-react"
import Link from "next/link"

interface ExportTemplate {
  id: string
  name: string
  description: string
  isDefault: boolean
  createdAt: string
  createdBy: string
  fieldCount: number
}

export default function ExportTemplatesPage() {
  const [templates, setTemplates] = useState<ExportTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/admin/export-templates")
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates)
      } else {
        throw new Error("Failed to fetch templates")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load export templates",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (templateId: string, templateName: string) => {
    setDeleteLoading(templateId)
    try {
      const response = await fetch(`/api/admin/export-templates/${templateId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Template Deleted",
          description: `"${templateName}" has been deleted successfully`,
        })
        fetchTemplates()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete template")
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete template",
        variant: "destructive",
      })
    } finally {
      setDeleteLoading(null)
    }
  }

  const handleDuplicate = async (templateId: string, templateName: string) => {
    try {
      // First, get the template details
      const response = await fetch(`/api/admin/export-templates/${templateId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch template details")
      }

      const data = await response.json()
      const template = data.template

      // Create a duplicate with modified name
      const duplicateResponse = await fetch("/api/admin/export-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          description: `Copy of ${template.description}`,
          isDefault: false,
          fieldMappings: template.fieldMappings
        }),
      })

      if (duplicateResponse.ok) {
        toast({
          title: "Template Duplicated",
          description: `"${templateName}" has been duplicated successfully`,
        })
        fetchTemplates()
      } else {
        const errorData = await duplicateResponse.json()
        throw new Error(errorData.error || "Failed to duplicate template")
      }
    } catch (error) {
      toast({
        title: "Duplicate Failed",
        description: error instanceof Error ? error.message : "Failed to duplicate template",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Export Templates</h1>
          <p className="text-muted-foreground">
            Manage Google Sheets export templates for timesheet data
          </p>
        </div>
        <Link href="/admin/export-templates/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Export Templates
          </CardTitle>
          <CardDescription>
            Configure how timesheet data is mapped to Google Sheets positions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Export Templates</h3>
              <p className="text-muted-foreground mb-4">
                Create your first export template to start exporting timesheets to Google Sheets
              </p>
              <Link href="/admin/export-templates/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Fields</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.name}</span>
                        {template.isDefault && (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {template.description || "No description"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {template.fieldCount} fields
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(new Date(template.createdAt), "MMM dd, yyyy")}</div>
                        <div className="text-muted-foreground">
                          by {template.createdBy || "System"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {template.isDefault ? (
                        <Badge>Default</Badge>
                      ) : (
                        <Badge variant="outline">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicate(template.id, template.name)}
                          className="flex items-center gap-1"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Link href={`/admin/export-templates/${template.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        {!template.isDefault && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                disabled={deleteLoading === template.id}
                              >
                                {deleteLoading === template.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Export Template</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{template.name}"? 
                                  This action cannot be undone and will affect any future exports 
                                  that reference this template.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(template.id, template.name)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete Template
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Template Configuration Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Client Metadata Fields</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Client Company Name</li>
                <li>• Client Contact Person</li>
                <li>• Job Name & Location</li>
                <li>• Shift Date & Time</li>
                <li>• Job Number</li>
                <li>• Crew Requested</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Employee Data Fields</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Employee Name & Contact</li>
                <li>• Job Title/Role</li>
                <li>• Clock In/Out Times (up to 3 entries)</li>
                <li>• Total Hours Worked</li>
                <li>• Timecard Notes</li>
              </ul>
            </div>
          </div>
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Templates use Excel-style column letters (A, B, C...) and row numbers to specify 
              where data should be inserted in Google Sheets. Each template can have separate 
              configurations for client metadata and employee data tables.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
