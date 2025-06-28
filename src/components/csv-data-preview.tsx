'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertCircle, Edit, Save, X } from 'lucide-react'
import { CSVRow } from '@/app/api/import/csv/parse/route'

interface CSVDataPreviewProps {
  data: CSVRow[]
  onDataChange: (data: CSVRow[]) => void
}

const WORKER_TYPES = ['CC', 'SH', 'FO', 'RFO', 'RG', 'GL']

const FIELD_LABELS: Record<string, string> = {
  client_name: 'Client Name',
  contact_name: 'Contact Name',
  contact_phone: 'Contact Phone',
  job_name: 'Job Name',
  job_start_date: 'Job Start Date',
  shift_date: 'Shift Date',
  shift_start_time: 'Shift Start Time',
  shift_end_time: 'Shift End Time',
  employee_name: 'Employee Name',
  employee_email: 'Employee Email',
  employee_phone: 'Employee Phone',
  worker_type: 'Worker Type',
  clock_in_1: 'Clock In 1',
  clock_out_1: 'Clock Out 1',
  clock_in_2: 'Clock In 2',
  clock_out_2: 'Clock Out 2',
  clock_in_3: 'Clock In 3',
  clock_out_3: 'Clock Out 3'
}

export function CSVDataPreview({ data, onDataChange }: CSVDataPreviewProps) {
  const [editingRow, setEditingRow] = useState<number | null>(null)
  const [editingData, setEditingData] = useState<CSVRow | null>(null)
  const [showErrorsOnly, setShowErrorsOnly] = useState(false)

  const filteredData = showErrorsOnly 
    ? data.filter(row => row._errors && row._errors.length > 0)
    : data

  const startEdit = (rowIndex: number) => {
    const actualIndex = data.findIndex(row => row._rowNumber === filteredData[rowIndex]._rowNumber)
    setEditingRow(actualIndex)
    setEditingData({ ...data[actualIndex] })
  }

  const cancelEdit = () => {
    setEditingRow(null)
    setEditingData(null)
  }

  const saveEdit = () => {
    if (editingRow === null || !editingData) return

    // Re-validate the edited row
    const validatedRow = validateEditedRow(editingData)
    
    const newData = [...data]
    newData[editingRow] = validatedRow
    onDataChange(newData)
    
    setEditingRow(null)
    setEditingData(null)
  }

  const validateEditedRow = (row: CSVRow): CSVRow => {
    const errors: string[] = []

    // Required field validation
    if (!row.client_name?.trim()) errors.push('Client name is required')
    if (!row.job_name?.trim()) errors.push('Job name is required')
    if (!row.shift_date?.trim()) errors.push('Shift date is required')
    if (!row.shift_start_time?.trim()) errors.push('Shift start time is required')
    if (!row.shift_end_time?.trim()) errors.push('Shift end time is required')
    if (!row.employee_name?.trim()) errors.push('Employee name is required')
    if (!row.worker_type?.trim()) errors.push('Worker type is required')

    // Date validation
    if (row.job_start_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.job_start_date)) {
      errors.push('Job start date must be in YYYY-MM-DD format')
    }
    if (row.shift_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.shift_date)) {
      errors.push('Shift date must be in YYYY-MM-DD format')
    }

    // Time validation
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (row.shift_start_time && !timeRegex.test(row.shift_start_time)) {
      errors.push('Shift start time must be in HH:MM format (24-hour)')
    }
    if (row.shift_end_time && !timeRegex.test(row.shift_end_time)) {
      errors.push('Shift end time must be in HH:MM format (24-hour)')
    }

    // Email validation
    if (row.employee_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.employee_email)) {
      errors.push('Employee email format is invalid')
    }

    // Worker type validation
    if (row.worker_type && !WORKER_TYPES.includes(row.worker_type)) {
      errors.push('Worker type must be one of: CC, SH, FO, RFO, RG, GL')
    }

    // Clock time validation
    for (let i = 1; i <= 3; i++) {
      const clockInKey = `clock_in_${i}` as keyof CSVRow
      const clockOutKey = `clock_out_${i}` as keyof CSVRow
      const clockIn = row[clockInKey] as string
      const clockOut = row[clockOutKey] as string

      if (clockIn && !timeRegex.test(clockIn)) {
        errors.push(`Clock in ${i} must be in HH:MM format (24-hour)`)
      }
      if (clockOut && !timeRegex.test(clockOut)) {
        errors.push(`Clock out ${i} must be in HH:MM format (24-hour)`)
      }
    }

    return {
      ...row,
      _errors: errors
    }
  }

  const updateEditingField = (field: keyof CSVRow, value: string) => {
    if (!editingData) return
    setEditingData({
      ...editingData,
      [field]: value
    })
  }

  const renderEditableCell = (row: CSVRow, field: keyof CSVRow) => {
    if (editingRow === null || editingData === null) {
      return <span className="text-sm">{row[field] || '-'}</span>
    }

    const value = editingData[field] || ''

    if (field === 'worker_type') {
      return (
        <Select value={value} onValueChange={(val) => updateEditingField(field, val)}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WORKER_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    return (
      <Input
        value={value}
        onChange={(e) => updateEditingField(field, e.target.value)}
        className="h-8 text-sm"
        placeholder={FIELD_LABELS[field]}
      />
    )
  }

  const renderCell = (row: CSVRow, field: keyof CSVRow, rowIndex: number) => {
    const actualRowIndex = data.findIndex(r => r._rowNumber === row._rowNumber)
    const isEditing = editingRow === actualRowIndex

    if (isEditing) {
      return renderEditableCell(row, field)
    }

    const value = row[field]
    const hasError = row._errors?.some(error => 
      error.toLowerCase().includes(field.replace('_', ' '))
    )

    return (
      <span className={`text-sm ${hasError ? 'text-red-600' : ''}`}>
        {value || '-'}
      </span>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Data Preview</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={showErrorsOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowErrorsOnly(!showErrorsOnly)}
            >
              {showErrorsOnly ? 'Show All' : 'Show Errors Only'}
            </Button>
            <Badge variant="outline">
              {filteredData.length} rows
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Row</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Shift Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((row, index) => {
                const actualRowIndex = data.findIndex(r => r._rowNumber === row._rowNumber)
                const isEditing = editingRow === actualRowIndex
                const hasErrors = row._errors && row._errors.length > 0

                return (
                  <TableRow key={row._rowNumber} className={hasErrors ? 'bg-red-50' : ''}>
                    <TableCell className="font-mono text-xs">
                      {row._rowNumber}
                    </TableCell>
                    <TableCell>{renderCell(row, 'client_name', index)}</TableCell>
                    <TableCell>{renderCell(row, 'job_name', index)}</TableCell>
                    <TableCell>{renderCell(row, 'shift_date', index)}</TableCell>
                    <TableCell>{renderCell(row, 'employee_name', index)}</TableCell>
                    <TableCell>{renderCell(row, 'worker_type', index)}</TableCell>
                    <TableCell>
                      {hasErrors ? (
                        <Badge variant="destructive" className="text-xs">
                          {row._errors!.length} error{row._errors!.length > 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Valid</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={saveEdit}>
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => startEdit(index)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Error Details */}
        {filteredData.some(row => row._errors && row._errors.length > 0) && (
          <div className="mt-4 space-y-2">
            <h4 className="font-medium text-sm">Validation Errors:</h4>
            {filteredData
              .filter(row => row._errors && row._errors.length > 0)
              .map(row => (
                <Alert key={row._rowNumber} className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Row {row._rowNumber}:</strong> {row._errors!.join(', ')}
                  </AlertDescription>
                </Alert>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
