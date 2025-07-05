import jsPDF from "jspdf"
import "jspdf-autotable"

interface TimeEntry {
  id: string;
  entryNumber: number;
  clockIn?: string;
  clockOut?: string;
}

interface AssignedPersonnel {
  employeeId: string;
  employeeName: string;
  employeeAvatar?: string;
  roleOnShift: string;
  roleCode: string;
  timeEntries: TimeEntry[];
  totalHours: string;
  totalMinutes: number;
}

interface TimesheetPDFData {
  timesheet: {
    id: string;
    status: string;
    clientSignature?: string;
    managerSignature?: string;
    clientApprovedAt?: string;
    managerApprovedAt?: string;
    submittedBy: string;
    submittedAt: string;
  };
  shift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    crewChiefName: string;
  };
  job: {
    id: string;
    name: string;
    client: {
      id: string;
      name: string;
      contactPerson: string;
    };
  };
  assignedPersonnel: AssignedPersonnel[];
  totals: {
    grandTotalHours: string;
    grandTotalMinutes: number;
    employeeCount: number;
  };
}

export function generateTimesheetPDF(data: TimesheetPDFData): jsPDF {
  const doc = new jsPDF("portrait", "pt", "letter")
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  // Helper function to format time
  const formatTime = (timeString?: string) => {
    if (!timeString) return ""
    try {
      const date = new Date(timeString)
      return date.toLocaleTimeString("en-US", { 
        hour: "2-digit", 
        minute: "2-digit",
        hour12: true 
      })
    } catch {
      return timeString
    }
  }

  // Helper function to format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", { 
        month: "2-digit",
        day: "2-digit", 
        year: "numeric"
      })
    } catch {
      return dateString
    }
  }

  // Header - HOLI TIMESHEET
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text("HOLI TIMESHEET", pageWidth / 2, 40, { align: "center" })
  
  // Company info section
  let yPos = 80
  
  // CLIENT PO# and HANDS ON JOB # row
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text("CLIENT PO#:", 40, yPos)
  doc.text("HANDS ON JOB #:", 300, yPos)
  doc.text(data.job.id, 400, yPos)
  
  yPos += 25
  
  // CLIENT NAME and LOCATION row
  doc.text("CLIENT NAME:", 40, yPos)
  doc.text(data.job.client.name, 130, yPos)
  doc.text("LOCATION:", 300, yPos)
  doc.text(data.shift.location || "", 360, yPos)
  
  yPos += 25
  
  // DATE/TIME row
  doc.text("DATE/TIME:", 40, yPos)
  doc.text(`${formatDate(data.shift.date)} ${formatTime(data.shift.startTime)} - ${formatTime(data.shift.endTime)}`, 110, yPos)
  
  yPos += 40
  
  // Table headers
  const headers = [
    "EMPLOYEE NAME",
    "JT", // Job Title/Role
    "EMPLOYEE INITIALS *** IN / OUT",
    "IN",
    "OUT", 
    "IN",
    "OUT",
    "IN", 
    "OUT",
    "TOTAL HOURS",
    "REG HOURS",
    "OT HOURS",
    "DT HOURS",
    "TA"
  ]
  
  // Calculate column widths
  const tableWidth = pageWidth - 80
  const colWidths = [
    tableWidth * 0.15, // Employee Name
    tableWidth * 0.05, // JT
    tableWidth * 0.15, // Employee Initials
    tableWidth * 0.08, // IN
    tableWidth * 0.08, // OUT
    tableWidth * 0.08, // IN
    tableWidth * 0.08, // OUT
    tableWidth * 0.08, // IN
    tableWidth * 0.08, // OUT
    tableWidth * 0.08, // Total Hours
    tableWidth * 0.06, // Reg Hours
    tableWidth * 0.06, // OT Hours
    tableWidth * 0.06, // DT Hours
    tableWidth * 0.04  // TA
  ]
  
  // Draw table headers
  doc.setFillColor(240, 240, 240)
  doc.rect(40, yPos - 15, tableWidth, 20, "F")
  
  doc.setFontSize(8)
  doc.setFont("helvetica", "bold")
  let xPos = 40
  headers.forEach((header, index) => {
    doc.text(header, xPos + 2, yPos - 2)
    xPos += colWidths[index]
  })
  
  yPos += 10
  
  // Draw table rows for employees
  doc.setFont("helvetica", "normal")
  data.assignedPersonnel.forEach((employee, rowIndex) => {
    const rowHeight = 20
    
    // Alternate row background
    if (rowIndex % 2 === 0) {
      doc.setFillColor(250, 250, 250)
      doc.rect(40, yPos, tableWidth, rowHeight, "F")
    }
    
    xPos = 40
    
    // Employee Name
    doc.text(employee.employeeName, xPos + 2, yPos + 12)
    xPos += colWidths[0]
    
    // JT (Job Title/Role Code)
    doc.text(employee.roleCode, xPos + 2, yPos + 12)
    xPos += colWidths[1]
    
    // Employee Initials (we'll use first letters of name)
    const initials = employee.employeeName.split(" ").map(n => n[0]).join("")
    doc.text(initials, xPos + 2, yPos + 12)
    xPos += colWidths[2]
    
    // Time entries (IN/OUT pairs)
    const timeEntry = employee.timeEntries[0] // Get first time entry
    if (timeEntry) {
      // First IN
      doc.text(formatTime(timeEntry.clockIn), xPos + 2, yPos + 12)
      xPos += colWidths[3]
      
      // First OUT
      doc.text(formatTime(timeEntry.clockOut), xPos + 2, yPos + 12)
      xPos += colWidths[4]
    } else {
      xPos += colWidths[3] + colWidths[4]
    }
    
    // Additional IN/OUT pairs (empty for now)
    xPos += colWidths[5] + colWidths[6] + colWidths[7] + colWidths[8]
    
    // Total Hours
    doc.text(employee.totalHours, xPos + 2, yPos + 12)
    xPos += colWidths[9]
    
    // REG HOURS (assuming all hours are regular for now)
    doc.text(employee.totalHours, xPos + 2, yPos + 12)
    xPos += colWidths[10]
    
    // OT HOURS (empty for now)
    xPos += colWidths[11]
    
    // DT HOURS (empty for now)
    xPos += colWidths[12]
    
    // TA (empty for now)
    xPos += colWidths[13]
    
    yPos += rowHeight
  })
  
  // Add empty rows to fill the table (like the template)
  const totalRows = 30
  const currentRows = data.assignedPersonnel.length
  for (let i = currentRows; i < totalRows; i++) {
    const rowHeight = 20
    
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 250)
      doc.rect(40, yPos, tableWidth, rowHeight, "F")
    }
    
    yPos += rowHeight
  }
  
  // Draw table borders
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(1)
  
  // Horizontal lines
  for (let i = 0; i <= totalRows + 1; i++) {
    const lineY = 80 + 40 + 10 + (i * 20)
    doc.line(40, lineY, 40 + tableWidth, lineY)
  }
  
  // Vertical lines
  xPos = 40
  colWidths.forEach((width, index) => {
    doc.line(xPos, 80 + 40 + 10 - 15, xPos, 80 + 40 + 10 + (totalRows * 20))
    xPos += width
  })
  // Final right border
  doc.line(40 + tableWidth, 80 + 40 + 10 - 15, 40 + tableWidth, 80 + 40 + 10 + (totalRows * 20))
  
  // Signature section
  yPos += 40
  
  doc.setFontSize(10)
  doc.text("CLIENT'S NAME (print):", 40, yPos)
  doc.text(data.job.client.contactPerson || "", 180, yPos)
  
  yPos += 25
  doc.text("* CLIENT'S SIGNATURE:", 40, yPos)
  
  // Add signature if available
  if (data.timesheet.clientSignature) {
    try {
      doc.addImage(data.timesheet.clientSignature, "PNG", 180, yPos - 15, 200, 30)
    } catch (error) {
      console.warn("Could not add client signature to PDF:", error)
    }
  }
  
  yPos += 35
  doc.setFontSize(8)
  doc.text("*By signing above, I agree to the Customer Agreement on the reverse.", 40, yPos)
  
  // Footer
  yPos = pageHeight - 60
  doc.setFontSize(10)
  doc.text("PHONE: 619-299-5991  1244 Knoxville Street San Diego, CA 92110  619-814-5599 :FAX", pageWidth / 2, yPos, { align: "center" })
  
  yPos += 20
  doc.text("White Copy - HANDS ON    Yellow Copy - Client", pageWidth / 2, yPos, { align: "center" })
  
  return doc
}
