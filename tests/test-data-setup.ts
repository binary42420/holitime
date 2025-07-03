import { Page } from '@playwright/test';

export interface TestUser {
  id?: string;
  name: string;
  email: string;
  password: string;
  role: 'Manager/Admin' | 'Crew Chief' | 'Employee' | 'Client';
  phone?: string;
  companyName?: string;
  location?: string;
}

export interface TestClient {
  id?: string;
  companyName: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
}

export interface TestJob {
  id?: string;
  name: string;
  clientId: string;
  description: string;
  location: string;
  startDate: string;
  endDate: string;
}

export interface TestShift {
  id?: string;
  jobId: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  requestedWorkers: number;
  crewChiefId?: string;
}

export class TestDataManager {
  private page: Page;
  private createdUsers: TestUser[] = [];
  private createdClients: TestClient[] = [];
  private createdJobs: TestJob[] = [];
  private createdShifts: TestShift[] = [];

  constructor(page: Page) {
    this.page = page;
  }

  // User management
  async createTestUser(userData: Partial<TestUser>): Promise<TestUser> {
    const user: TestUser = {
      name: userData.name || `Test User ${Date.now()}`,
      email: userData.email || `test${Date.now()}@example.com`,
      password: userData.password || 'password123',
      role: userData.role || 'Employee',
      phone: userData.phone || '555-0100',
      companyName: userData.companyName,
      location: userData.location || 'Test Location'
    };

    const response = await this.page.request.post('/api/users', {
      data: user
    });

    if (!response.ok()) {
      throw new Error(`Failed to create test user: ${response.status()}`);
    }

    const result = await response.json();
    user.id = result.user.id;
    this.createdUsers.push(user);
    
    return user;
  }

  async createTestUsers(): Promise<TestUser[]> {
    const users = [
      {
        name: 'Admin Test User',
        email: 'admin@test.com',
        password: 'admin123',
        role: 'Manager/Admin' as const,
        phone: '555-0001'
      },
      {
        name: 'Crew Chief Test User',
        email: 'crew@test.com',
        password: 'crew123',
        role: 'Crew Chief' as const,
        phone: '555-0002'
      },
      {
        name: 'Employee Test User',
        email: 'employee@test.com',
        password: 'emp123',
        role: 'Employee' as const,
        phone: '555-0003'
      },
      {
        name: 'Client Test User',
        email: 'client@test.com',
        password: 'client123',
        role: 'Client' as const,
        phone: '555-0004',
        companyName: 'Test Client Company'
      }
    ];

    const createdUsers = [];
    for (const userData of users) {
      try {
        const user = await this.createTestUser(userData);
        createdUsers.push(user);
      } catch (error) {
        // User might already exist, try to get existing user
        console.log(`User ${userData.email} might already exist`);
      }
    }

    return createdUsers;
  }

  // Client management
  async createTestClient(clientData: Partial<TestClient>): Promise<TestClient> {
    const client: TestClient = {
      companyName: clientData.companyName || `Test Company ${Date.now()}`,
      contactPerson: clientData.contactPerson || 'Test Contact',
      contactEmail: clientData.contactEmail || `contact${Date.now()}@example.com`,
      contactPhone: clientData.contactPhone || '555-0200',
      address: clientData.address || '123 Test Street, Test City, TC 12345'
    };

    const response = await this.page.request.post('/api/clients', {
      data: client
    });

    if (!response.ok()) {
      throw new Error(`Failed to create test client: ${response.status()}`);
    }

    const result = await response.json();
    client.id = result.client.id;
    this.createdClients.push(client);
    
    return client;
  }

  async createTestClients(): Promise<TestClient[]> {
    const clients = [
      {
        companyName: 'Construction Corp',
        contactPerson: 'John Builder',
        contactEmail: 'john@construction.com',
        contactPhone: '555-0201',
        address: '100 Construction Ave, Build City, BC 10001'
      },
      {
        companyName: 'Event Solutions',
        contactPerson: 'Jane Events',
        contactEmail: 'jane@events.com',
        contactPhone: '555-0202',
        address: '200 Event Plaza, Party Town, PT 20002'
      },
      {
        companyName: 'Retail Chain',
        contactPerson: 'Bob Store',
        contactEmail: 'bob@retail.com',
        contactPhone: '555-0203',
        address: '300 Shopping Center, Mall City, MC 30003'
      }
    ];

    const createdClients = [];
    for (const clientData of clients) {
      try {
        const client = await this.createTestClient(clientData);
        createdClients.push(client);
      } catch (error) {
        console.log(`Client ${clientData.companyName} might already exist`);
      }
    }

    return createdClients;
  }

  // Job management
  async createTestJob(jobData: Partial<TestJob>): Promise<TestJob> {
    if (!jobData.clientId && this.createdClients.length === 0) {
      throw new Error('No client available for job creation');
    }

    const job: TestJob = {
      name: jobData.name || `Test Job ${Date.now()}`,
      clientId: jobData.clientId || this.createdClients[0].id!,
      description: jobData.description || 'Test job description',
      location: jobData.location || 'Test Job Location',
      startDate: jobData.startDate || new Date().toISOString().split('T')[0],
      endDate: jobData.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    const response = await this.page.request.post('/api/jobs', {
      data: job
    });

    if (!response.ok()) {
      throw new Error(`Failed to create test job: ${response.status()}`);
    }

    const result = await response.json();
    job.id = result.job.id;
    this.createdJobs.push(job);
    
    return job;
  }

  // Shift management
  async createTestShift(shiftData: Partial<TestShift>): Promise<TestShift> {
    if (!shiftData.jobId && this.createdJobs.length === 0) {
      throw new Error('No job available for shift creation');
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const shift: TestShift = {
      jobId: shiftData.jobId || this.createdJobs[0].id!,
      date: shiftData.date || tomorrow.toISOString().split('T')[0],
      startTime: shiftData.startTime || '09:00',
      endTime: shiftData.endTime || '17:00',
      location: shiftData.location || 'Test Shift Location',
      requestedWorkers: shiftData.requestedWorkers || 5,
      crewChiefId: shiftData.crewChiefId
    };

    const response = await this.page.request.post('/api/shifts', {
      data: shift
    });

    if (!response.ok()) {
      throw new Error(`Failed to create test shift: ${response.status()}`);
    }

    const result = await response.json();
    shift.id = result.shift.id;
    this.createdShifts.push(shift);
    
    return shift;
  }

  // Setup complete test environment
  async setupCompleteTestEnvironment(): Promise<{
    users: TestUser[];
    clients: TestClient[];
    jobs: TestJob[];
    shifts: TestShift[];
  }> {
    console.log('🏗️  Setting up complete test environment...');

    // Create users
    const users = await this.createTestUsers();
    console.log(`✅ Created ${users.length} test users`);

    // Create clients
    const clients = await this.createTestClients();
    console.log(`✅ Created ${clients.length} test clients`);

    // Create jobs for each client
    const jobs = [];
    for (const client of clients) {
      try {
        const job = await this.createTestJob({
          name: `${client.companyName} Project`,
          clientId: client.id,
          description: `Test project for ${client.companyName}`,
          location: client.address
        });
        jobs.push(job);
      } catch (error) {
        console.log(`Failed to create job for client ${client.companyName}`);
      }
    }
    console.log(`✅ Created ${jobs.length} test jobs`);

    // Create shifts for each job
    const shifts = [];
    for (const job of jobs) {
      try {
        // Create multiple shifts for variety
        const shiftDates = [1, 2, 3].map(days => {
          const date = new Date();
          date.setDate(date.getDate() + days);
          return date.toISOString().split('T')[0];
        });

        for (const date of shiftDates) {
          const shift = await this.createTestShift({
            jobId: job.id,
            date,
            startTime: '08:00',
            endTime: '16:00',
            location: job.location,
            requestedWorkers: Math.floor(Math.random() * 8) + 3 // 3-10 workers
          });
          shifts.push(shift);
        }
      } catch (error) {
        console.log(`Failed to create shifts for job ${job.name}`);
      }
    }
    console.log(`✅ Created ${shifts.length} test shifts`);

    console.log('🎉 Test environment setup complete!');

    return { users, clients, jobs, shifts };
  }

  // Cleanup methods
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test data...');

    // Delete in reverse order of creation
    for (const shift of this.createdShifts) {
      try {
        await this.page.request.delete(`/api/shifts/${shift.id}`);
      } catch (error) {
        console.log(`Failed to delete shift ${shift.id}`);
      }
    }

    for (const job of this.createdJobs) {
      try {
        await this.page.request.delete(`/api/jobs/${job.id}`);
      } catch (error) {
        console.log(`Failed to delete job ${job.id}`);
      }
    }

    for (const client of this.createdClients) {
      try {
        await this.page.request.delete(`/api/clients/${client.id}`);
      } catch (error) {
        console.log(`Failed to delete client ${client.id}`);
      }
    }

    for (const user of this.createdUsers) {
      try {
        await this.page.request.delete(`/api/users/${user.id}`);
      } catch (error) {
        console.log(`Failed to delete user ${user.id}`);
      }
    }

    console.log('✅ Test data cleanup complete');
  }

  // Getters for created data
  getUsers(): TestUser[] { return this.createdUsers; }
  getClients(): TestClient[] { return this.createdClients; }
  getJobs(): TestJob[] { return this.createdJobs; }
  getShifts(): TestShift[] { return this.createdShifts; }
}
