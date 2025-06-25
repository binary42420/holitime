export type UserRole = 'Employee' | 'Crew Chief' | 'Manager/Admin';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
}

export interface Client {
  id: string;
  name:string;
  address: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
}

export interface Employee {
  id: string;
  name: string;
  certifications: string[];
  performance: number; // 1-5 scale
  location: string;
  avatar: string;
}

export type AssignedPersonnelStatus = 'Clocked Out' | 'Clocked In' | 'On Break' | 'Shift Ended';

export interface AssignedPersonnel {
  employee: Employee;
  roleOnShift: string;
  status: AssignedPersonnelStatus;
  timeEntries: { clockIn?: string; clockOut?: string }[];
}

export type TimesheetStatus = 'Pending Finalization' | 'Awaiting Client Approval' | 'Awaiting Manager Approval' | 'Approved' | 'Rejected';

export interface Shift {
  id: string;
  timesheetId: string;
  client: Client;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  crewChief: Employee;
  assignedPersonnel: AssignedPersonnel[];
  status: 'Upcoming' | 'In Progress' | 'Completed' | 'Cancelled';
  timesheetStatus: TimesheetStatus;
  notes?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
}

export type DocumentStatus = 'Pending Submission' | 'Submitted' | 'Approved' | 'Rejected';

export interface AppDocument {
  id: string;
  name: string;
  type: 'Contract' | 'Certification' | 'Insurance' | 'Training Record' | 'Tax Form' | 'Policy';
  category: 'Employee' | 'Client' | 'Company';
  uploadDate: string;
  url: string;
  status?: DocumentStatus;
  assigneeId?: string;
  isTemplate?: boolean;
}

export interface Timesheet {
    id: string;
    shiftId: string;
    status: TimesheetStatus;
    clientSignature?: string; // a data URI
    approvedByClientAt?: string;
    approvedByManagerAt?: string;
}
