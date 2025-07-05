import type { User, Client, Job, Employee, Shift, Announcement, AppDocument, UserRole, Timesheet } from "./types"

export const mockUsers: Record<UserRole, User> = {
  "Employee": { id: "emp1", name: "Alex Johnson", email: "alex.j@handson.com", avatar: "/avatars/01.png", role: "Employee" },
  "Crew Chief": { id: "cc1", name: "Maria Garcia", email: "maria.g@handson.com", avatar: "/avatars/02.png", role: "Crew Chief" },
  "Manager/Admin": { id: "mgr1", name: "Sam Chen", email: "sam.c@handson.com", avatar: "/avatars/03.png", role: "Manager/Admin" },
  "Client": { id: "cli-user1", name: "John Smith", email: "jsmith@constructo.com", avatar: "/avatars/04.png", role: "Client", clientId: "cli1" },
  "User": { id: "user1", name: "Jane Doe", email: "jane.doe@example.com", avatar: "/avatars/05.png", role: "User" },
}

export const mockEmployees: Employee[] = [
  { id: "emp1", name: "Alex Johnson", certifications: ["Forklift", "OSHA 10"], performance: 4.5, location: "Downtown", avatar: "https://placehold.co/32x32.png" },
  { id: "emp2", name: "Ben Carter", certifications: ["OSHA 30"], performance: 4.8, location: "Northside", avatar: "https://placehold.co/32x32.png" },
  { id: "emp3", name: "Chloe Davis", certifications: ["Forklift"], performance: 4.2, location: "West End", avatar: "https://placehold.co/32x32.png" },
  { id: "emp4", name: "David Evans", certifications: [], performance: 4.0, location: "Downtown", avatar: "https://placehold.co/32x32.png" },
  { id: "cc1", name: "Maria Garcia", certifications: ["First Aid", "Crew Management"], performance: 4.9, location: "Downtown", avatar: "https://placehold.co/32x32.png" },
  { id: "cli-user1", name: "John Smith", certifications: [], performance: 0, location: "Constructo Corp.", avatar: "https://placehold.co/32x32.png" },
]

export const mockClients: Client[] = [
  { id: "cli1", name: "Constructo Corp.", companyName: "Constructo Corp.", address: "123 Main St, Buildville", contactPerson: "John Smith", contactEmail: "jsmith@constructo.com", contactPhone: "555-1234" },
  { id: "cli2", name: "EventMakers Inc.", companyName: "EventMakers Inc.", address: "456 Market Ave, EventCity", contactPerson: "Jane Doe", contactEmail: "jdoe@eventmakers.com", contactPhone: "555-5678", authorizedCrewChiefIds: ["emp2"] },
]

export const mockJobs: Job[] = [
  { id: "job1", clientId: "cli1", name: "Downtown Core Project", description: "Major construction project in the city center." },
  { id: "job2", clientId: "cli1", name: "Suburban Office Complex", description: "Renovation of a 3-story office building.", authorizedCrewChiefIds: ["emp1"] },
  { id: "job3", clientId: "cli2", name: "City Park Festival", description: "Annual music and arts festival setup and teardown." },
]

export const mockShifts: Shift[] = [
  {
    id: "shft1",
    timesheetId: "ts1",
    jobId: "job1",
    authorizedCrewChiefIds: [],
    date: "2024-08-15T12:00:00.000Z",
    startTime: "08:00",
    endTime: "17:00",
    location: "Downtown Core Project - Site A",
    crewChief: mockEmployees[4], // Maria Garcia
    assignedPersonnel: [
      { employee: mockEmployees[0], roleOnShift: "Forklift Operator", roleCode: "FO", status: "Clocked In", timeEntries: [{ clockIn: "07:58" }] },
      { employee: mockEmployees[2], roleOnShift: "General Laborer", roleCode: "GL", status: "On Break", timeEntries: [{ clockIn: "08:01", clockOut: "12:00" }] },
      { employee: mockEmployees[3], roleOnShift: "General Laborer", roleCode: "GL", status: "Clocked Out", timeEntries: [] },
      { employee: mockEmployees[4], roleOnShift: "Crew Chief", roleCode: "CC", status: "Clocked In", timeEntries: [{ clockIn: "07:55" }] },
    ],
    status: "In Progress",
    timesheetStatus: "Pending Finalization",
    notes: "Morning safety meeting at 7:45 AM sharp. Hard hats required on site at all times."
  },
  {
    id: "shft2",
    timesheetId: "ts2",
    jobId: "job3",
    authorizedCrewChiefIds: [],
    date: "2024-08-16T12:00:00.000Z",
    startTime: "10:00",
    endTime: "19:00",
    location: "City Park Festival Setup",
    crewChief: mockEmployees[4], // Maria Garcia
    assignedPersonnel: [
      { employee: mockEmployees[4], roleOnShift: "Crew Chief", roleCode: "CC", status: "Clocked Out", timeEntries: [] },
      { employee: mockEmployees[0], roleOnShift: "General Laborer", roleCode: "GL", status: "Clocked Out", timeEntries: [] }
    ],
    status: "Upcoming",
    timesheetStatus: "Pending Finalization",
  },
  {
    id: "shft3",
    timesheetId: "ts3",
    jobId: "job2",
    authorizedCrewChiefIds: ["cc1"], // Maria Garcia can view this shift even though she is not the chief
    date: "2024-08-10T12:00:00.000Z",
    startTime: "09:00",
    endTime: "17:00",
    location: "Suburban Office Complex - West Wing",
    crewChief: mockEmployees[1], // Ben Carter
    assignedPersonnel: [
      { employee: mockEmployees[0], roleOnShift: "Rigger", roleCode: "RG", status: "Shift Ended", timeEntries: [{ clockIn: "09:00", clockOut: "17:00" }] },
      { employee: mockEmployees[1], roleOnShift: "Crew Chief", roleCode: "CC", status: "Shift Ended", timeEntries: [{ clockIn: "08:55", clockOut: "17:05" }] },
    ],
    status: "Completed",
    timesheetStatus: "Approved"
  },
]

export const mockAnnouncements: Announcement[] = [
  { id: "ann1", title: "Company Picnic Announcement", content: "Join us for our annual company picnic on September 5th at City Park. Fun, food, and games for the whole family!", date: "2024-08-01T12:00:00Z" },
  { id: "ann2", title: "New Safety Protocol for Forklifts", content: "Effective immediately, all forklift operators must complete a new daily inspection checklist before operation. Please see your crew chief for details.", date: "2024-07-28T12:00:00Z" },
]

export const mockDocuments: AppDocument[] = [
  // Admin/Manager view documents
  { id: "doc1", name: "Alex_Johnson_OSHA10.pdf", type: "Certification", category: "Employee", uploadDate: "2023-06-15", url: "#", assigneeId: "emp1", status: "Approved" },
  { id: "doc2", name: "Constructo_Corp_Contract_2024.pdf", type: "Contract", category: "Client", uploadDate: "2024-01-20", url: "#" },
  { id: "doc3", name: "Company_Insurance_Policy.pdf", type: "Insurance", category: "Client", uploadDate: "2024-03-01", url: "#" },
  { id: "doc4", name: "Ben_Carter_OSHA30.pdf", type: "Certification", category: "Employee", uploadDate: "2023-09-10", url: "#", assigneeId: "emp2", status: "Approved" },

  // Templates for new hires
  { id: "template1", name: "W-4 (Federal Tax Withholding)", type: "Tax Form", category: "Company", uploadDate: "2023-01-01", url: "#", isTemplate: true },
  { id: "template2", name: "I-9 (Employment Eligibility)", type: "Tax Form", category: "Company", uploadDate: "2023-01-01", url: "#", isTemplate: true },
  { id: "template3", name: "Company Handbook Agreement", type: "Policy", category: "Company", uploadDate: "2023-01-01", url: "#", isTemplate: true },
    
  // Documents assigned to our demo user 'Alex Johnson' (emp1)
  { id: "userdoc1", name: "W-4 (Federal Tax Withholding)", type: "Tax Form", category: "Employee", uploadDate: "2024-08-20", url: "#", assigneeId: "emp1", status: "Pending Submission" },
  { id: "userdoc2", name: "I-9 (Employment Eligibility)", type: "Tax Form", category: "Employee", uploadDate: "2024-08-20", url: "#", assigneeId: "emp1", status: "Pending Submission" },
  { id: "userdoc3", name: "Company Handbook Agreement", type: "Policy", category: "Employee", uploadDate: "2024-08-20", url: "#", assigneeId: "emp1", status: "Submitted" },
  { id: "userdoc4", name: "Direct Deposit Form", type: "Policy", category: "Employee", uploadDate: "2024-08-19", url: "#", assigneeId: "emp1", status: "Approved" },
    
  // Another user for testing
  { id: "userdoc5", name: "W-4 (Federal Tax Withholding)", type: "Tax Form", category: "Employee", uploadDate: "2024-08-20", url: "#", assigneeId: "cc1", status: "Approved" },
]


export const mockTimesheets: Timesheet[] = [
  { id: "ts1", shiftId: "shft1", status: "Awaiting Client Approval" },
  { id: "ts2", shiftId: "shft2", status: "Pending Finalization" },
  { id: "ts3", shiftId: "shft3", status: "Approved", clientSignature: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", approvedByClientAt: "2024-08-10T17:05:00Z", approvedByManagerAt: "2024-08-11T09:00:00Z"},
]
