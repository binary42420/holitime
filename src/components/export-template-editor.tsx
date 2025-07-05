'use client';

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface FieldMapping {
  id?: string
  fieldType: "client_metadata" | "employee_data"
  fieldName: string
  columnLetter: string
  rowNumber: number
  isHeader: boolean
  displayName: string
  dataType: "text" | "number" | "date" | "time"
  formatPattern?: string
}

interface ExportTemplateEditorProps {
  templateId?: string
  mode: "create" | "edit"
}

const AVAILABLE_FIELDS = {
  client_metadata: [
    { name: "hands_on_job_number", label: "Hands On Job Number", type: "text" },
    { name: "client_po_number", label: "Client PO Number", type: "text" },
    { name: "client_name", label: "Client Company Name", type: "text" },
    { name: "client_contact", label: "Client Contact Person", type: "text" },
    { name: "job_location", label: "Job Location", type: "text" },
    { name: "job_name", label: "Job Name", type: "text" },
    { name: "shift_date", label: "Shift Date", type: "date" },
    { name: "crew_requested", label: "Crew Requested", type: "text" },
    { name: "job_notes", label: "Job Notes", type: "text" },
  ],
  employee_data: [
    { name: "shift_date", label: "Shift Date", type: "date" },
    { name: "crew_requested", label: "Crew Requested", type: "text" },
    { name: "employee_email", label: "Employee Email", type: "text" },
    { name: "employee_contact", label: "Employee Contact", type: "text" },
    { name: "employee_name", label: "Employee Name", type: "text" },
    { name: "job_title", label: "Job Title/Role", type: "text" },
    { name: "check_in_out_status", label: "Check In/Out Status", type: "text" },
    { name: "clock_in_1", label: "Clock In 1", type: "time" },
    { name: "clock_out_1", label: "Clock Out 1", type: "time" },
    { name: "clock_in_2", label: "Clock In 2", type: "time" },
    { name: "clock_out_2", label: "Clock Out 2", type: "time" },
    { name: "clock_in_3", label: "Clock In 3", type: "time" },
    { name: "clock_out_3", label: "Clock Out 3", type: "time" },
    { name: "timecard_notes", label: "Timecard Notes", type: "text" },
  ]
}

export default function ExportTemplateEditor({ templateId, mode }: ExportTemplateEditorProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const fetchTemplate = React.useCallback(async () => {
    if (!templateId) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/export-templates/${templateId}`)
      if (response.ok) {
        const data = await response.json()
        const template = data.template
        
        setName(template.name)
        setDescription(template.description || "")
        setIsDefault(template.isDefault)
        setFieldMappings(template.fieldMappings || [])
      } else {
        throw new Error("Failed to fetch template")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load template",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [templateId, toast])

  useEffect(() => {
    if (mode === "edit" && templateId) {
      fetchTemplate()
    }
  }, [mode, templateId, fetchTemplate])

  const addFieldMapping = () => {
    const newMapping: FieldMapping = {
      fieldType: "client_metadata",
      fieldName: "",
      columnLetter: "A",
      rowNumber: 1,
      isHeader: false,
      displayName: "",
      dataType: "text"
    }
    setFieldMappings([...fieldMappings, newMapping])
  }

  const updateFieldMapping = (index: number, updates: Partial<FieldMapping>) => {
    const updated = [...fieldMappings]
    updated[index] = { ...updated[index], ...updates }
    
    // Auto-update display name and data type when field name changes
    if (updates.fieldName) {
      const availableFields = AVAILABLE_FIELDS[updated[index].fieldType]
      const fieldInfo = availableFields.find(f => f.name === updates.fieldName)
      if (fieldInfo) {
        updated[index].displayName = fieldInfo.label
        updated[index].dataType = fieldInfo.type as any
      }
    }
    
    setFieldMappings(updated)
  }

  const removeFieldMapping = (index: number) => {
    setFieldMappings(fieldMappings.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Template name is required",
        variant: "destructive",
      })
      return
    }

    if (fieldMappings.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one field mapping is required",
        variant: "destructive",
      })
      return
    }

    // Validate field mappings
    for (const mapping of fieldMappings) {
      if (!mapping.fieldName || !mapping.columnLetter || !mapping.rowNumber) {
        toast({
          title: "Validation Error",
          description: "All field mappings must have field name, column, and row specified",
          variant: "destructive",
        })
        return
      }
    }

    setSaving(true)
    try {
      const url = mode === "create" 
        ? "/api/admin/export-templates"
        : `/api/admin/export-templates/${templateId}`
      
      const method = mode === "create" ? "POST" : "PUT"
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          isDefault,
          fieldMappings
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Template ${mode === "create" ? "created" : "updated"} successfully`,
        })
        router.push("/admin/export-templates")
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${mode} template`)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${mode} template`,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
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
          <h1 className="text-3xl font-bold font-headline">
            {mode === "create" ? "Create" : "Edit"} Export Template
          </h1>
          <p className="text-muted-foreground">
            Configure how timesheet data maps to Google Sheets positions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </div>

      {/* Template Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Template Information</CardTitle>
          <CardDescription>
            Basic template settings and metadata
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter template name"
              />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox 
                id="is-default" 
                checked={isDefault} 
                onCheckedChange={setIsDefault}
              />
              <Label htmlFor="is-default">Set as default template</Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this template's purpose and configuration"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Field Mappings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Field Mappings
            <Button onClick={addFieldMapping} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </CardTitle>
          <CardDescription>
            Configure where each data field should be placed in the Google Sheets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fieldMappings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No field mappings configured</p>
              <Button onClick={addFieldMapping}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Field
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field Type</TableHead>
                  <TableHead>Field Name</TableHead>
                  <TableHead>Column</TableHead>
                  <TableHead>Row</TableHead>
                  <TableHead>Header</TableHead>
                  <TableHead>Data Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fieldMappings.map((mapping, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Select
                        value={mapping.fieldType}
                        onValueChange={(value: "client_metadata" | "employee_data") => 
                          updateFieldMapping(index, { fieldType: value, fieldName: "" })
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client_metadata">Client Metadata</SelectItem>
                          <SelectItem value="employee_data">Employee Data</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mapping.fieldName}
                        onValueChange={(value) => updateFieldMapping(index, { fieldName: value })}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_FIELDS[mapping.fieldType].map((field) => (
                            <SelectItem key={field.name} value={field.name}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={mapping.columnLetter}
                        onChange={(e) => updateFieldMapping(index, { columnLetter: e.target.value.toUpperCase() })}
                        placeholder="A"
                        className="w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={mapping.rowNumber}
                        onChange={(e) => updateFieldMapping(index, { rowNumber: parseInt(e.target.value) || 1 })}
                        min="1"
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={mapping.isHeader}
                        onCheckedChange={(checked) => updateFieldMapping(index, { isHeader: !!checked })}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{mapping.dataType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFieldMapping(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}