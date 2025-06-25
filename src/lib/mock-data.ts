import type { User, Client, Employee, Shift, Announcement, AppDocument, UserRole } from './types';

export const mockUsers: Record<UserRole, User> = {
  'Employee': { id: 'emp1', name: 'Alex Johnson', email: 'alex.j@handson.com', avatar: '/avatars/01.png', role: 'Employee' },
  'Crew Chief': { id: 'cc1', name: 'Maria Garcia', email: 'maria.g@handson.com', avatar: '/avatars/02.png', role: 'Crew Chief' },
  'Manager/Admin': { id: 'mgr1', name: 'Sam Chen', email: 'sam.c@handson.com', avatar: '/avatars/03.png', role: 'Manager/Admin' },
};

export const mockEmployees: Employee[] = [
  { id: 'emp1', name: 'Alex Johnson', certifications: ['Forklift', 'OSHA 10'], performance: 4.5, location: 'Downtown', avatar: 'https://placehold.co/32x32.png' },
  { id: 'emp2', name: 'Ben Carter', certifications: ['OSHA 30'], performance: 4.8, location: 'Northside', avatar: 'https://placehold.co/32x32.png' },
  { id: 'emp3', name: 'Chloe Davis', certifications: ['Forklift'], performance: 4.2, location: 'West End', avatar: 'https://placehold.co/32x32.png' },
  { id: 'emp4', name: 'David Evans', certifications: [], performance: 4.0, location: 'Downtown', avatar: 'https://placehold.co/32x32.png' },
  { id: 'cc1', name: 'Maria Garcia', certifications: ['First Aid', 'Crew Management'], performance: 4.9, location: 'Downtown', avatar: 'https://placehold.co/32x32.png' },
];

export const mockClients: Client[] = [
  { id: 'cli1', name: 'Constructo Corp.', address: '123 Main St, Buildville', contactPerson: 'John Smith', contactEmail: 'jsmith@constructo.com', contactPhone: '555-1234' },
  { id: 'cli2', name: 'EventMakers Inc.', address: '456 Market Ave, EventCity', contactPerson: 'Jane Doe', contactEmail: 'jdoe@eventmakers.com', contactPhone: '555-5678' },
];

export const mockShifts: Shift[] = [
  {
    id: 'shft1',
    client: mockClients[0],
    date: '2024-08-15T12:00:00Z',
    startTime: '08:00',
    endTime: '17:00',
    location: 'Downtown Core Project',
    crewChief: mockEmployees[1],
    assignedPersonnel: [
      { employee: mockEmployees[0], checkedIn: false, timeEntries: [{ clockIn: '07:58', clockOut: '12:00' }, { clockIn: '12:30', clockOut: '17:02' }] },
      { employee: mockEmployees[2], checkedIn: false, timeEntries: [{ clockIn: '08:01', clockOut: '17:00' }] },
      { employee: mockEmployees[3], checkedIn: false, timeEntries: [] },
    ],
    status: 'Upcoming',
    notes: 'Morning safety meeting at 7:45 AM sharp. Hard hats required on site at all times.'
  },
  {
    id: 'shft2',
    client: mockClients[1],
    date: '2024-08-16T12:00:00Z',
    startTime: '10:00',
    endTime: '19:00',
    location: 'City Park Festival Setup',
    crewChief: mockEmployees[4],
    assignedPersonnel: [
      { employee: mockEmployees[4], checkedIn: false, timeEntries: [] },
      { employee: mockEmployees[0], checkedIn: false, timeEntries: [] }
    ],
    status: 'Upcoming'
  },
  {
    id: 'shft3',
    client: mockClients[0],
    date: '2024-08-10T12:00:00Z',
    startTime: '09:00',
    endTime: '17:00',
    location: 'Suburban Office Complex',
    crewChief: mockEmployees[1],
    assignedPersonnel: [
      { employee: mockEmployees[0], checkedIn: false, timeEntries: [{ clockIn: '09:00', clockOut: '17:00' }] },
    ],
    status: 'Completed'
  },
];

export const mockAnnouncements: Announcement[] = [
  { id: 'ann1', title: 'Company Picnic Announcement', content: 'Join us for our annual company picnic on September 5th at City Park. Fun, food, and games for the whole family!', date: '2024-08-01T12:00:00Z' },
  { id: 'ann2', title: 'New Safety Protocol for Forklifts', content: 'Effective immediately, all forklift operators must complete a new daily inspection checklist before operation. Please see your crew chief for details.', date: '2024-07-28T12:00:00Z' },
];

export const mockDocuments: AppDocument[] = [
    { id: 'doc1', name: 'Alex_Johnson_OSHA10.pdf', type: 'Certification', category: 'Employee', uploadDate: '2023-06-15', url: '#' },
    { id: 'doc2', name: 'Constructo_Corp_Contract_2024.pdf', type: 'Contract', category: 'Client', uploadDate: '2024-01-20', url: '#' },
    { id: 'doc3', name: 'Company_Insurance_Policy.pdf', type: 'Insurance', category: 'Client', uploadDate: '2024-03-01', url: '#' },
    { id: 'doc4', name: 'Ben_Carter_OSHA30.pdf', type: 'Certification', category: 'Employee', uploadDate: '2023-09-10', url: '#' },
];
