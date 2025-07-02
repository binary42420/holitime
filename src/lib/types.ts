export type UserRole = 'Employee' | 'Crew Chief' | 'Manager/Admin' | 'Client' | 'User';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  clientCompanyId?: string | null; // For client users, references clients table

  // Employee-specific fields (null for non-employees)
  certifications?: string[];
  performance?: number;
  location?: string;

  // Employee permission fields
  crewChiefEligible?: boolean;
  forkOperatorEligible?: boolean;

  // Legacy fields - will be removed after full migration
  companyName?: string;
  companyAddress?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
}

// Client Company interface - represents the actual client company entity
export interface ClientCompany {
  id: string;
  companyName: string;
  companyAddress?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Client interface now represents a client contact person (role: 'Client')
// This is a user who works for a client company
export interface Client {
  id: string; // This is the user ID (contact person)
  name: string; // Contact person name
  email: string; // Contact person email
  clientCompanyId: string; // References ClientCompany
  clientCompany?: ClientCompany; // Populated client company data

  // Backward compatibility fields for frontend (will be deprecated)
  companyName?: string; // Maps to clientCompany.companyName
  companyAddress?: string; // Maps to clientCompany.companyAddress
  contactPerson?: string; // Maps to name
  contactEmail?: string; // Maps to email
  contactPhone?: string; // Maps to clientCompany.contactPhone
  address?: string; // Maps to companyAddress
  phone?: string; // Maps to contactPhone
  notes?: string; // Maps to clientCompany.notes

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
  clientId: string; // Now references clients table (ClientCompany), not users table
  clientName?: string;
  shiftCount?: number;
  startDate?: string;
  endDate?: string;
  status?: 'Planning' | 'Active' | 'Completed';
  authorizedCrewChiefIds?: string[];
}

// Crew Chief Permission System Types
export type CrewChiefPermissionType = 'client' | 'job' | 'shift';

export interface CrewChiefPermission {
  id: string;
  userId: string; // Must be a user with role 'Employee' OR 'Crew Chief'
  permissionType: CrewChiefPermissionType;
  targetId: string; // clientId, jobId, or shiftId depending on permissionType
  grantedByUserId: string;
  grantedAt: string;
  revokedAt?: string;
}

// Helper interface for checking crew chief permissions
export interface CrewChiefPermissionCheck {
  hasPermission: boolean;
  permissionSource: 'designated' | 'client' | 'job' | 'shift' | 'none';
  permissions: CrewChiefPermission[];
}

// Crew Chief Role Clarification:
// - Role 'Crew Chief': Indicates eligibility/capability to be assigned as crew chief on shifts
//   Does NOT automatically grant any permissions beyond 'Employee' role
// - Admin-granted permissions: Can be granted to both 'Employee' and 'Crew Chief' role users
// - Designated crew chief: When assigned as crew chief on a specific shift, automatically
//   grants management permissions for that shift only

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
