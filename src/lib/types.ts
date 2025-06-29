export type UserRole = 'Employee' | 'Crew Chief' | 'Manager/Admin' | 'Client' | 'User';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  clientId?: string | null; // For client users, this is their own ID; for employees, it's null

  // Employee-specific fields (null for non-employees)
  certifications?: string[];
  performance?: number;
  location?: string;

  // Employee permission fields
  crewChiefEligible?: boolean;
  forkOperatorEligible?: boolean;

  // Client company fields (null for non-clients)
  companyName?: string;
  companyAddress?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
}

// Client interface now represents a client user (role: 'Client')
// Client company data is stored directly in the User interface
export interface Client {
  id: string; // This is now the user ID
  name: string; // User name
  companyName: string; // Company name
  companyAddress?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  // Backward compatibility fields for frontend
  address?: string; // Maps to companyAddress
  email?: string; // Maps to contactEmail
  phone?: string; // Maps to contactPhone
  notes?: string; // Optional notes field
  authorizedCrewChiefIds?: string[];
  mostRecentCompletedShift?: {
    id: string;
    date: string;
    jobName: string;
  };
  mostRecentUpcomingShift?: {
    id: string;
    date: string;
    startTime: string;
    jobName: string;
    requestedWorkers: number;
    assignedCount: number;
  };
}

export interface Job {
  id: string;
  name: string;
  description?: string;
  clientId: string;
  clientName?: string;
  shiftCount?: number;
  startDate?: string;
  endDate?: string;
  status?: 'Planning' | 'Active' | 'Completed';
  authorizedCrewChiefIds?: string[];
}

// Employee interface now represents an employee user (role: 'Employee' | 'Crew Chief')
// Employee data is stored directly in the User interface
export interface Employee {
  id: string; // This is now the user ID
  name: string; // User name
  certifications: string[];
  performance: number; // 1-5 scale
  location: string;
  avatar: string;
}

export type AssignedPersonnelStatus = 'Clocked Out' | 'Clocked In' | 'On Break' | 'Shift Ended';

export type RoleCode = 'CC' | 'SH' | 'FO' | 'RFO' | 'RG' | 'GL';

export interface AssignedPersonnel {
  employee: Employee;
  roleOnShift: string;
  roleCode: RoleCode;
  status: AssignedPersonnelStatus;
  timeEntries: { clockIn?: string; clockOut?: string }[];
  isPlaceholder?: boolean;
}

export type TimesheetStatus = 'Pending Finalization' | 'Awaiting Client Approval' | 'Awaiting Manager Approval' | 'Approved' | 'Rejected';

export interface WorkerRequirement {
  roleCode: RoleCode;
  requiredCount: number;
}

export interface Shift {
  id: string;
  timesheetId: string;
  jobId: string;
  jobName?: string;
  clientName?: string;
  authorizedCrewChiefIds: string[];
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  requestedWorkers?: number;
  assignedCount?: number;
  workerRequirements?: WorkerRequirement[];
  crewChief: Employee | null;
  crewChiefId?: string;
  crewChiefName?: string;
  crewChiefAvatar?: string;
  assignedPersonnel: AssignedPersonnel[];
  status: 'Upcoming' | 'In Progress' | 'Completed' | 'Cancelled' | 'Pending Approval';
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
