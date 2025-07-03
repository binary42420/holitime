"use client"

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { FileSpreadsheet, ExternalLink, Settings, Download } from 'lucide-react'

interface ExportTemplate {
  id: string
  name: string
  description: string
  isDefault: boolean
  fieldCount: number
}

interface TimesheetExportDialogProps {
  timesheetId: string
  timesheetStatus: string
  disabled?: boolean
  trigger?: React.ReactNode
}

export default function TimesheetExportDialog({
  timesheetId,
  timesheetStatus,
  disabled = false,
  trigger
}: TimesheetExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<ExportTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [spreadsheetId, setSpreadsheetId] = useState('')
  const [createNew, setCreateNew] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const { toast } = useToast()

  // Check if timesheet can be exported
  const canExport = ['completed', 'pending_client_approval', 'pending_final_approval'].includes(timesheetStatus)

  useEffect(() => {
    if (open) {
      fetchTemplates()
    }
  }, [open])

  const fetchTemplates = async () => {
    setLoadingTemplates(true)
    try {
      const response = await fetch('/api/admin/export-templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates)
        
        // Auto-select default template
        const defaultTemplate = data.templates.find((t: ExportTemplate) => t.isDefault)
        if (defaultTemplate) {
          setSelectedTemplate(defaultTemplate.id)
        }
      } else {
        throw new Error('Failed to fetch templates')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load export templates",
        variant: "destructive",
      })
    } finally {
      setLoadingTemplates(false)
    }
  }

  const handleExport = async () => {
    if (!selectedTemplate) {
      toast({
        title: "Template Required",
        description: "Please select an export template",
        variant: "destructive",
      })
      return
    }

    if (!createNew && !spreadsheetId) {
      toast({
        title: "Spreadsheet ID Required",
        description: "Please provide a Google Sheets ID or choose to create a new spreadsheet",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/timesheets/${timesheetId}/export-to-sheets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplate,
          spreadsheetId: createNew ? null : spreadsheetId,
          createNew
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Export Successful",
          description: `Timesheet exported to Google Sheets with ${data.exportedEmployees} employees`,
          action: (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(data.spreadsheetUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Sheet
            </Button>
          ),
        })
        setOpen(false)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Export failed')
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export timesheet",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            variant="outline" 
            disabled={disabled || !canExport}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export to Sheets
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Export Timesheet to Google Sheets
          </DialogTitle>
          <DialogDescription>
            Export this finalized timesheet to Google Sheets using a configurable template.
          </DialogDescription>
        </DialogHeader>

        {!canExport ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <p className="text-muted-foreground">
                  Only finalized timesheets can be exported to Google Sheets.
                </p>
                <Badge variant="outline">Status: {timesheetStatus}</Badge>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Template Selection */}
            <div className="space-y-2">
              <Label htmlFor="template">Export Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingTemplates ? "Loading templates..." : "Select a template"} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{template.name}</span>
                        {template.isDefault && (
                          <Badge variant="secondary" className="ml-2">Default</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplateData && (
                <p className="text-sm text-muted-foreground">
                  {selectedTemplateData.description} ({selectedTemplateData.fieldCount} fields configured)
                </p>
              )}
            </div>

            {/* Template Preview */}
            {selectedTemplateData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Template Preview</CardTitle>
                  <CardDescription>
                    This template will map timesheet data to the configured Google Sheets positions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium mb-2">Client Metadata</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Client Name & Contact</li>
                        <li>• Job Name & Location</li>
                        <li>• Shift Date & Details</li>
                        <li>• Job Number</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Employee Data</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Employee Names & Roles</li>
                        <li>• Clock In/Out Times (3 entries)</li>
                        <li>• Contact Information</li>
                        <li>• Total Hours Worked</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Destination Options */}
            <div className="space-y-4">
              <Label>Export Destination</Label>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="create-new" 
                    checked={createNew} 
                    onCheckedChange={setCreateNew}
                  />
                  <Label htmlFor="create-new" className="text-sm">
                    Create new Google Sheets document
                  </Label>
                </div>

                {!createNew && (
                  <div className="space-y-2">
                    <Label htmlFor="spreadsheet-id" className="text-sm">
                      Existing Google Sheets ID
                    </Label>
                    <Input
                      id="spreadsheet-id"
                      placeholder="Enter Google Sheets document ID"
                      value={spreadsheetId}
                      onChange={(e) => setSpreadsheetId(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      You can find the ID in the Google Sheets URL: 
                      docs.google.com/spreadsheets/d/<strong>SPREADSHEET_ID</strong>/edit
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => window.open('/admin/export-templates', '_blank')}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Manage Templates
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={loading || !canExport || !selectedTemplate}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export to Sheets
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
