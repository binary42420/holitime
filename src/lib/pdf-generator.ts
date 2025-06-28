import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { format } from 'date-fns'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

interface TimeEntry {
  id: string
  entryNumber: number
  clockIn?: string
  clockOut?: string
  isActive: boolean
}

interface TimesheetWorker {
  id: string
  employeeName: string
  roleOnShift: string
  roleCode: string
  status: string
  timeEntries: TimeEntry[]
}

interface TimesheetData {
  id: string
  shift: {
    id: string
    date: string
    startTime: string
    endTime: string
    location: string
    job: {
      name: string
      client: {
        name: string
        contactPerson?: string
        contactEmail?: string
      }
    }
    crewChief: {
      name: string
    }
  }
  assignedPersonnel: TimesheetWorker[]
  status: string
  createdAt: string
}

export function generateTimesheetPDF(timesheetData: TimesheetData): jsPDF {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const margin = 20

  // Header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('TIMESHEET', pageWidth / 2, 30, { align: 'center' })

  // Company info
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('Hands On Labor - Workforce Management', pageWidth / 2, 40, { align: 'center' })

  // Shift information
  let yPos = 60
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Shift Information', margin, yPos)

  yPos += 10
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')

  const shiftInfo = [
    ['Client:', timesheetData.shift.job.client.name],
    ['Job:', timesheetData.shift.job.name],
    ['Date:', format(new Date(timesheetData.shift.date), 'EEEE, MMMM d, yyyy')],
    ['Time:', `${timesheetData.shift.startTime} - ${timesheetData.shift.endTime}`],
    ['Location:', timesheetData.shift.location],
    ['Crew Chief:', timesheetData.shift.crewChief.name],
    ['Timesheet ID:', timesheetData.id],
    ['Status:', timesheetData.status]
  ]

  shiftInfo.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold')
    doc.text(label, margin, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(value || 'N/A', margin + 40, yPos)
    yPos += 8
  })

  // Time entries table
  yPos += 10
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Time Entries', margin, yPos)

  yPos += 10

  // Prepare table data
  const tableData = timesheetData.assignedPersonnel.map(worker => {
    const timeEntries = worker.timeEntries.sort((a, b) => a.entryNumber - b.entryNumber)
    
    // Calculate total hours
    let totalMinutes = 0
    timeEntries.forEach(entry => {
      if (entry.clockIn && entry.clockOut) {
        const clockIn = new Date(entry.clockIn)
        const clockOut = new Date(entry.clockOut)
        totalMinutes += (clockOut.getTime() - clockIn.getTime()) / (1000 * 60)
      }
    })
    
    const totalHours = (totalMinutes / 60).toFixed(2)

    return [
      worker.employeeName,
      `${worker.roleCode} - ${worker.roleOnShift}`,
      timeEntries[0]?.clockIn ? format(new Date(timeEntries[0].clockIn), 'HH:mm') : '-',
      timeEntries[0]?.clockOut ? format(new Date(timeEntries[0].clockOut), 'HH:mm') : '-',
      timeEntries[1]?.clockIn ? format(new Date(timeEntries[1].clockIn), 'HH:mm') : '-',
      timeEntries[1]?.clockOut ? format(new Date(timeEntries[1].clockOut), 'HH:mm') : '-',
      timeEntries[2]?.clockIn ? format(new Date(timeEntries[2].clockIn), 'HH:mm') : '-',
      timeEntries[2]?.clockOut ? format(new Date(timeEntries[2].clockOut), 'HH:mm') : '-',
      totalHours,
      worker.status
    ]
  })

  // Add table
  doc.autoTable({
    startY: yPos,
    head: [[
      'Employee Name',
      'Role',
      'Clock In 1',
      'Clock Out 1',
      'Clock In 2',
      'Clock Out 2',
      'Clock In 3',
      'Clock Out 3',
      'Total Hours',
      'Status'
    ]],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    columnStyles: {
      0: { cellWidth: 25 }, // Employee Name
      1: { cellWidth: 20 }, // Role
      2: { cellWidth: 15 }, // Clock In 1
      3: { cellWidth: 15 }, // Clock Out 1
      4: { cellWidth: 15 }, // Clock In 2
      5: { cellWidth: 15 }, // Clock Out 2
      6: { cellWidth: 15 }, // Clock In 3
      7: { cellWidth: 15 }, // Clock Out 3
      8: { cellWidth: 18 }, // Total Hours
      9: { cellWidth: 20 }  // Status
    },
    margin: { left: margin, right: margin }
  })

  // Summary
  const finalY = (doc as any).lastAutoTable.finalY + 20
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Summary', margin, finalY)

  const totalWorkers = timesheetData.assignedPersonnel.length
  const totalHours = timesheetData.assignedPersonnel.reduce((sum, worker) => {
    let workerMinutes = 0
    worker.timeEntries.forEach(entry => {
      if (entry.clockIn && entry.clockOut) {
        const clockIn = new Date(entry.clockIn)
        const clockOut = new Date(entry.clockOut)
        workerMinutes += (clockOut.getTime() - clockIn.getTime()) / (1000 * 60)
      }
    })
    return sum + (workerMinutes / 60)
  }, 0)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Total Workers: ${totalWorkers}`, margin, finalY + 15)
  doc.text(`Total Hours: ${totalHours.toFixed(2)}`, margin, finalY + 25)

  // Signature section
  const signatureY = finalY + 50
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Approvals', margin, signatureY)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  // Client signature line
  doc.text('Client Signature:', margin, signatureY + 20)
  doc.line(margin + 40, signatureY + 20, margin + 120, signatureY + 20)
  doc.text('Date:', margin + 130, signatureY + 20)
  doc.line(margin + 145, signatureY + 20, margin + 180, signatureY + 20)

  // Manager signature line
  doc.text('Manager Signature:', margin, signatureY + 40)
  doc.line(margin + 45, signatureY + 40, margin + 125, signatureY + 40)
  doc.text('Date:', margin + 135, signatureY + 40)
  doc.line(margin + 150, signatureY + 40, margin + 185, signatureY + 40)

  // Footer
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Generated on ${format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}`,
    pageWidth / 2,
    pageHeight - 20,
    { align: 'center' }
  )

  return doc
}

export function downloadTimesheetPDF(timesheetData: TimesheetData, filename?: string) {
  const doc = generateTimesheetPDF(timesheetData)
  const defaultFilename = `timesheet-${timesheetData.shift.job.client.name.replace(/\s+/g, '-')}-${format(new Date(timesheetData.shift.date), 'yyyy-MM-dd')}.pdf`
  doc.save(filename || defaultFilename)
}

export function getTimesheetPDFBlob(timesheetData: TimesheetData): Blob {
  const doc = generateTimesheetPDF(timesheetData)
  return doc.output('blob')
}
