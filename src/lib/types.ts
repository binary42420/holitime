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
  name: string;
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

export interface Shift {
  id: string;
  client: Client;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  crewChief: Employee;
  assignedPersonnel: { employee: Employee; checkedIn: boolean, clockIn?: string, clockOut?: string }[];
  status: 'Upcoming' | 'In Progress' | 'Completed' | 'Cancelled';
  notes?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
}

export interface AppDocument {
  id: string;
  name: string;
  type: 'Contract' | 'Certification' | 'Insurance' | 'Training Record';
  category: 'Employee' | 'Client';
  uploadDate: string;
  url: string;
}
