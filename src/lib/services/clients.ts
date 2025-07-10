import { query } from '../db';
import type { Client, ClientCompany } from '../types';

// Client Company functions (for the actual company entities)
export async function getAllClientCompanies(): Promise<ClientCompany[]> {
  try {
    const result = await query(`
      SELECT id, company_name, company_address, contact_phone, contact_email
      FROM clients
      ORDER BY company_name
    `);

    return result.rows.map(row => ({
      id: row.id,
      companyName: row.company_name,
      companyAddress: row.company_address,
      contactPhone: row.contact_phone,
      contactEmail: row.contact_email,    }));
  } catch (error) {
    console.error('Error getting all client companies:', error);
    return [];
  }
}

export async function getClientCompanyById(id: string): Promise<ClientCompany | null> {
  try {
    const result = await query(`
      SELECT id, company_name, company_address, contact_phone, contact_email
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
export async function getClientsCount(): Promise<number> {
  try {
    const result = await query("SELECT COUNT(*) FROM clients");
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    console.error('Error getting clients count:', error);
    throw error;
  }
}

export async function getRecentClients(limit: number = 5): Promise<Client[]> {
  try {
    const result = await query(`
      SELECT
        u.id, u.name, u.email, u.client_company_id,
        c.company_name, c.company_address
      FROM users u
      LEFT JOIN clients c ON u.client_company_id = c.id
      WHERE u.role = 'Client'
      ORDER BY u.created_at DESC
      LIMIT $1
    `, [limit]);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      clientCompanyId: row.client_company_id,
      companyName: row.company_name,
      companyAddress: row.company_address,
      contactPerson: row.name,
      contactEmail: row.email,
    }));
  } catch (error) {
    console.error('Error getting recent clients:', error);
    return [];
  }
}

export async function getAllClients(limit?: number, offset?: number, sort?: string, order?: string): Promise<Client[]> {
  try {
    const sortColumn = sort || 'c.company_name';
    const sortOrder = order || 'ASC';
    const queryParams: any[] = [];
    let paramIndex = 1;

    let queryString = `
      SELECT
        u.id, u.name, u.email, u.client_company_id,
        c.company_name, c.company_address, c.contact_phone, c.contact_email as company_contact_email, c.notes
      FROM users u
      JOIN clients c ON u.client_company_id = c.id
      WHERE u.role = 'Client'
      ORDER BY ${sortColumn} ${sortOrder}
    `;

    if (limit) {
      queryString += ` LIMIT $${paramIndex++}`;
      queryParams.push(limit);
    }
    if (offset) {
      queryString += ` OFFSET $${paramIndex++}`;
      queryParams.push(offset);
    }

    const clientsResult = await query(queryString, queryParams);
    if (clientsResult.rows.length === 0) {
      return [];
    }

    const clientCompanyIds = clientsResult.rows.map(c => c.client_company_id);

    // Now, fetch the shifts for these specific clients in a more optimized way
    const shiftsQuery = `
      WITH ranked_shifts AS (
        SELECT
          j.client_id, s.id, s.date, s.start_time, j.name as job_name, s.status,
          s.requested_workers,
          (SELECT COUNT(*) FROM assigned_personnel ap WHERE ap.shift_id = s.id AND ap.is_placeholder = false) as assigned_count,
          ROW_NUMBER() OVER(PARTITION BY j.client_id, s.status ORDER BY s.date DESC, s.start_time DESC) as rn
        FROM shifts s
        JOIN jobs j ON s.job_id = j.id
        WHERE j.client_id = ANY($1::uuid[])
      )
      SELECT * FROM ranked_shifts WHERE rn <= 5;
    `;
    
    const shiftsResult = await query(shiftsQuery, [clientCompanyIds]);
    
    const shiftsByClient = shiftsResult.rows.reduce((acc, shift) => {
      if (!acc[shift.client_id]) {
        acc[shift.client_id] = { completed: [], upcoming: [] };
      }
      if (shift.status === 'Completed') {
        acc[shift.client_id].completed.push(shift);
      } else if (shift.status === 'Upcoming' || shift.status === 'In Progress') {
        acc[shift.client_id].upcoming.push(shift);
      }
      return acc;
    }, {} as Record<string, { completed: any[], upcoming: any[] }>);


    return clientsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      clientCompanyId: row.client_company_id,
      companyName: row.company_name,
      companyAddress: row.company_address,
      contactPerson: row.name,
      contactEmail: row.email,
      contactPhone: row.contact_phone,
      notes: row.notes,
      mostRecentCompletedShifts: shiftsByClient[row.client_company_id]?.completed || [],
      mostRecentUpcomingShifts: shiftsByClient[row.client_company_id]?.upcoming || [],
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

      authorizedCrewChiefIds: crewChiefsResult.rows.map(r => r.crew_chief_id),
      mostRecentCompletedShifts: recentCompletedResult.rows.map(r => ({
        id: r.id,
        date: r.date,
        jobName: r.job_name,
      })),
      mostRecentUpcomingShifts: upcomingResult.rows.map(r => ({
        id: r.id,
        date: r.date,
        startTime: r.start_time,
        jobName: r.job_name,
        requestedWorkers: parseInt(r.requested_workers) || 1,
        assignedCount: parseInt(r.assigned_count) || 0,
      })),
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
      INSERT INTO clients (company_name, company_address, contact_phone, contact_email, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, company_name, company_address, contact_phone, contact_email, notes
    `, [
      clientData.companyName,
      clientData.companyAddress,
      clientData.contactPhone,
      clientData.contactEmail,
      clientData.notes
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.company_name,
      email: row.contact_email,
      clientCompanyId: row.id,
      companyName: row.company_name,
      companyAddress: row.company_address,
      contactPerson: row.company_name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      address: row.company_address,
      phone: row.contact_phone,
      notes: row.notes,
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
