import { query } from '../db';
import type { Client, ClientCompany } from '../types';

// Client Company functions (for the actual company entities)
export async function getAllClientCompanies(): Promise<ClientCompany[]> {
  try {
    const result = await query(`
      SELECT id, company_name, company_address, contact_phone, contact_email, notes, created_at, updated_at
      FROM clients
      ORDER BY company_name
    `);

    return result.rows.map(row => ({
      id: row.id,
      companyName: row.company_name,
      companyAddress: row.company_address,
      contactPhone: row.contact_phone,
      contactEmail: row.contact_email,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('Error getting all client companies:', error);
    return [];
  }
}

export async function getClientCompanyById(id: string): Promise<ClientCompany | null> {
  try {
    const result = await query(`
      SELECT id, company_name, company_address, contact_phone, contact_email, notes, created_at, updated_at
      FROM clients
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      companyName: row.company_name,
      companyAddress: row.company_address,
      contactPhone: row.contact_phone,
      contactEmail: row.contact_email,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error('Error getting client company by ID:', error);
    return null;
  }
}

// Client Contact functions (for the contact person users)
export async function getAllClients(): Promise<Client[]> {
  try {
    const result = await query(`
      SELECT
        u.id, u.name, u.email, u.client_company_id,
        c.company_name, c.company_address, c.contact_phone, c.contact_email as company_contact_email, c.notes,
        -- Job count (now based on client company, not user)
        COALESCE(job_counts.job_count, 0) as job_count,
        -- Most recent completed shift
        completed_shift.shift_id as completed_shift_id,
        completed_shift.shift_date as completed_shift_date,
        completed_shift.job_name as completed_job_name,
        -- Most recent upcoming shift
        upcoming_shift.shift_id as upcoming_shift_id,
        upcoming_shift.shift_date as upcoming_shift_date,
        upcoming_shift.start_time as upcoming_shift_start_time,
        upcoming_shift.job_name as upcoming_job_name,
        upcoming_shift.requested_workers as upcoming_requested_workers,
        upcoming_shift.assigned_count as upcoming_assigned_count
      FROM users u
      LEFT JOIN clients c ON u.client_company_id = c.id
      LEFT JOIN (
        SELECT client_id, COUNT(*) as job_count
        FROM jobs
        GROUP BY client_id
      ) job_counts ON u.client_company_id = job_counts.client_id
      LEFT JOIN (
        SELECT DISTINCT ON (j.client_id)
          j.client_id,
          s.id as shift_id,
          s.date as shift_date,
          j.name as job_name
        FROM shifts s
        JOIN jobs j ON s.job_id = j.id
        WHERE s.status = 'Completed'
        ORDER BY j.client_id, s.date DESC, s.start_time DESC
      ) completed_shift ON u.client_company_id = completed_shift.client_id
      LEFT JOIN (
        SELECT DISTINCT ON (j.client_id)
          j.client_id,
          s.id as shift_id,
          s.date as shift_date,
          s.start_time,
          j.name as job_name,
          COALESCE(s.requested_workers, 1) as requested_workers,
          COALESCE(assigned_counts.assigned_count, 0) as assigned_count
        FROM shifts s
        JOIN jobs j ON s.job_id = j.id
        LEFT JOIN (
          SELECT shift_id, COUNT(*) as assigned_count
          FROM assigned_personnel
          WHERE is_placeholder = false
          GROUP BY shift_id
        ) assigned_counts ON s.id = assigned_counts.shift_id
        WHERE s.status IN ('Upcoming', 'In Progress') AND s.date >= CURRENT_DATE
        ORDER BY j.client_id, s.date ASC, s.start_time ASC
      ) upcoming_shift ON u.client_company_id = upcoming_shift.client_id
      WHERE u.role = 'Client' AND u.client_company_id IS NOT NULL
      ORDER BY COALESCE(c.company_name, u.name)
    `);

    return result.rows.map(row => ({
      id: row.id, // User ID (contact person)
      name: row.name, // Contact person name
      email: row.email, // Contact person email
      clientCompanyId: row.client_company_id,
      clientCompany: row.client_company_id ? {
        id: row.client_company_id,
        companyName: row.company_name,
        companyAddress: row.company_address,
        contactPhone: row.contact_phone,
        contactEmail: row.company_contact_email,
        notes: row.notes,
      } : undefined,

      // Backward compatibility fields for the frontend
      companyName: row.company_name,
      companyAddress: row.company_address,
      contactPerson: row.name, // Contact person is the user name
      contactEmail: row.email, // Contact person email is the user email
      contactPhone: row.contact_phone,
      address: row.company_address,
      phone: row.contact_phone,
      notes: row.notes,

      authorizedCrewChiefIds: [], // Will be populated separately if needed
      mostRecentCompletedShift: row.completed_shift_id ? {
        id: row.completed_shift_id,
        date: row.completed_shift_date,
        jobName: row.completed_job_name,
      } : undefined,
      mostRecentUpcomingShift: row.upcoming_shift_id ? {
        id: row.upcoming_shift_id,
        date: row.upcoming_shift_date,
        startTime: row.upcoming_shift_start_time,
        jobName: row.upcoming_job_name,
        requestedWorkers: parseInt(row.upcoming_requested_workers) || 1,
        assignedCount: parseInt(row.upcoming_assigned_count) || 0,
      } : undefined,
    }));
  } catch (error) {
    console.error('Error getting all clients:', error);
    return [];
  }
}

export async function getClientById(id: string): Promise<Client | null> {
  try {
    const result = await query(`
      SELECT
        u.id, u.name, u.email, u.client_company_id,
        c.company_name, c.company_address, c.contact_phone, c.contact_email as company_contact_email, c.notes
      FROM users u
      LEFT JOIN clients c ON u.client_company_id = c.id
      WHERE u.id = $1 AND u.role = 'Client'
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    // Get jobs for this client company
    const jobsResult = await query(`
      SELECT id, name, description, status, start_date,
        (SELECT COUNT(*) FROM shifts WHERE job_id = jobs.id) as shifts_count
      FROM jobs
      WHERE client_id = $1
      ORDER BY start_date DESC
    `, [row.client_company_id]);

    // Get authorized crew chiefs
    const crewChiefsResult = await query(`
      SELECT crew_chief_id FROM job_authorizations ja
      JOIN jobs j ON ja.job_id = j.id
      WHERE j.client_id = $1
    `, [row.client_company_id]);

    // Note: Contact user IDs are no longer needed since client is now a user

    // Get most recent completed shift
    const recentCompletedResult = await query(`
      SELECT s.id, s.date, j.name as job_name
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      WHERE j.client_id = $1 AND s.status = 'Completed'
      ORDER BY s.date DESC, s.start_time DESC
      LIMIT 1
    `, [row.client_company_id]);

    // Get next upcoming shift
    const upcomingResult = await query(`
      SELECT
        s.id, s.date, s.start_time, j.name as job_name,
        COALESCE(s.requested_workers, 1) as requested_workers,
        COALESCE(assigned_counts.assigned_count, 0) as assigned_count
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      LEFT JOIN (
        SELECT shift_id, COUNT(*) as assigned_count
        FROM assigned_personnel
        WHERE is_placeholder = false
        GROUP BY shift_id
      ) assigned_counts ON s.id = assigned_counts.shift_id
      WHERE j.client_id = $1 AND s.status = 'Upcoming' AND s.date >= CURRENT_DATE
      ORDER BY s.date ASC, s.start_time ASC
      LIMIT 1
    `, [row.client_company_id]);

    return {
      id: row.id, // User ID (contact person)
      name: row.name, // Contact person name
      email: row.email, // Contact person email
      clientCompanyId: row.client_company_id,
      clientCompany: row.client_company_id ? {
        id: row.client_company_id,
        companyName: row.company_name,
        companyAddress: row.company_address,
        contactPhone: row.contact_phone,
        contactEmail: row.company_contact_email,
        notes: row.notes,
      } : undefined,

      // Backward compatibility fields for the frontend
      companyName: row.company_name,
      companyAddress: row.company_address,
      contactPerson: row.name, // Contact person is the user name
      contactEmail: row.email, // Contact person email is the user email
      contactPhone: row.contact_phone,
      address: row.company_address,
      phone: row.contact_phone,
      notes: row.notes,

      jobs: jobsResult.rows.map(job => ({
        id: job.id,
        name: job.name,
        description: job.description,
        status: job.status,
        startDate: job.start_date,
        shiftsCount: parseInt(job.shifts_count) || 0,
      })),
      authorizedCrewChiefIds: crewChiefsResult.rows.map(r => r.crew_chief_id),
      mostRecentCompletedShift: recentCompletedResult.rows.length > 0 ? {
        id: recentCompletedResult.rows[0].id,
        date: recentCompletedResult.rows[0].date,
        jobName: recentCompletedResult.rows[0].job_name,
      } : undefined,
      mostRecentUpcomingShift: upcomingResult.rows.length > 0 ? {
        id: upcomingResult.rows[0].id,
        date: upcomingResult.rows[0].date,
        startTime: upcomingResult.rows[0].start_time,
        jobName: upcomingResult.rows[0].job_name,
        requestedWorkers: parseInt(upcomingResult.rows[0].requested_workers) || 1,
        assignedCount: parseInt(upcomingResult.rows[0].assigned_count) || 0,
      } : undefined,
    };
  } catch (error) {
    console.error('Error getting client by ID:', error);
    return null;
  }
}

export async function createClient(clientData: Omit<Client, 'id' | 'authorizedCrewChiefIds'>): Promise<Client | null> {
  try {
    const result = await query(`
      INSERT INTO users (name, email, password_hash, role, company_name, company_address, contact_person, contact_email, contact_phone)
      VALUES ($1, $2, $3, 'Client', $4, $5, $6, $7, $8)
      RETURNING id, name, company_name, company_address, contact_person, contact_email, contact_phone
    `, [
      clientData.name,
      clientData.contactEmail || `${clientData.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
      'password123', // Default plain text password
      clientData.companyName,
      clientData.companyAddress,
      clientData.contactPerson,
      clientData.contactEmail,
      clientData.contactPhone
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      companyName: row.company_name,
      companyAddress: row.company_address,
      contactPerson: row.contact_person,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      // Add backward compatibility fields for the frontend
      address: row.company_address,
      email: row.contact_email,
      phone: row.contact_phone,
      authorizedCrewChiefIds: [],
    };
  } catch (error) {
    console.error('Error creating client:', error);
    return null;
  }
}

export async function updateClient(id: string, clientData: Partial<Omit<Client, 'id' | 'authorizedCrewChiefIds'>>): Promise<Client | null> {
  try {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (clientData.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(clientData.name);
    }
    if (clientData.companyName !== undefined) {
      fields.push(`company_name = $${paramCount++}`);
      values.push(clientData.companyName);
    }
    if (clientData.companyAddress !== undefined) {
      fields.push(`company_address = $${paramCount++}`);
      values.push(clientData.companyAddress);
    }
    if (clientData.contactPerson !== undefined) {
      fields.push(`contact_person = $${paramCount++}`);
      values.push(clientData.contactPerson);
    }
    if (clientData.contactEmail !== undefined) {
      fields.push(`contact_email = $${paramCount++}`);
      values.push(clientData.contactEmail);
    }
    if (clientData.contactPhone !== undefined) {
      fields.push(`contact_phone = $${paramCount++}`);
      values.push(clientData.contactPhone);
    }

    if (fields.length === 0) {
      return await getClientById(id);
    }

    values.push(id);
    const result = await query(`
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $${paramCount} AND role = 'Client'
      RETURNING id, name, company_name, company_address, contact_person, contact_email, contact_phone
    `, values);

    if (result.rows.length === 0) {
      return null;
    }

    return await getClientById(id);
  } catch (error) {
    console.error('Error updating client:', error);
    return null;
  }
}

export async function deleteClient(id: string): Promise<boolean> {
  try {
    const result = await query('DELETE FROM users WHERE id = $1 AND role = \'Client\'', [id]);
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Error deleting client:', error);
    return false;
  }
}
