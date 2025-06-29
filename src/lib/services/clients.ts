import { query } from '../db';
import type { Client } from '../types';

export async function getAllClients(): Promise<Client[]> {
  try {
    const result = await query(`
      SELECT
        u.id, u.name, u.company_name, u.company_address, u.contact_person, u.contact_email, u.contact_phone,
        -- Job count
        COALESCE(job_counts.job_count, 0) as job_count,
        -- Most recent completed shift
        completed_shift.shift_id as completed_shift_id,
        completed_shift.shift_date as completed_shift_date,
        completed_shift.job_name as completed_job_name,
        -- Most recent upcoming shift
        upcoming_shift.shift_id as upcoming_shift_id,
        upcoming_shift.shift_date as upcoming_shift_date,
        upcoming_shift.job_name as upcoming_job_name
      FROM users u
      LEFT JOIN (
        SELECT client_id, COUNT(*) as job_count
        FROM jobs
        GROUP BY client_id
      ) job_counts ON u.id = job_counts.client_id
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
      ) completed_shift ON u.id = completed_shift.client_id
      LEFT JOIN (
        SELECT DISTINCT ON (j.client_id)
          j.client_id,
          s.id as shift_id,
          s.date as shift_date,
          j.name as job_name
        FROM shifts s
        JOIN jobs j ON s.job_id = j.id
        WHERE s.status IN ('Upcoming', 'In Progress')
        ORDER BY j.client_id, s.date ASC, s.start_time ASC
      ) upcoming_shift ON u.id = upcoming_shift.client_id
      WHERE u.role = 'Client'
      ORDER BY COALESCE(u.company_name, u.name)
    `);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      companyName: row.company_name || row.name,
      companyAddress: row.company_address,
      contactPerson: row.contact_person,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      jobCount: parseInt(row.job_count) || 0,
      // Add backward compatibility fields for the frontend
      address: row.company_address, // Map companyAddress to address for frontend
      email: row.contact_email, // Map contactEmail to email for frontend
      phone: row.contact_phone, // Map contactPhone to phone for frontend
      authorizedCrewChiefIds: [], // Will be populated separately if needed
      mostRecentCompletedShift: row.completed_shift_id ? {
        id: row.completed_shift_id,
        date: row.completed_shift_date,
        jobName: row.completed_job_name,
      } : undefined,
      mostRecentUpcomingShift: row.upcoming_shift_id ? {
        id: row.upcoming_shift_id,
        date: row.upcoming_shift_date,
        jobName: row.upcoming_job_name,
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
      SELECT id, name, company_name, company_address, contact_person, contact_email, contact_phone
      FROM users
      WHERE id = $1 AND role = 'Client'
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    // Get authorized crew chiefs
    const crewChiefsResult = await query(`
      SELECT crew_chief_id FROM job_authorizations ja
      JOIN jobs j ON ja.job_id = j.id
      WHERE j.client_id = $1
    `, [id]);

    // Note: Contact user IDs are no longer needed since client is now a user

    // Get most recent completed shift
    const recentCompletedResult = await query(`
      SELECT s.id, s.date, j.name as job_name
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      WHERE j.client_id = $1 AND s.status = 'Completed'
      ORDER BY s.date DESC, s.start_time DESC
      LIMIT 1
    `, [id]);

    // Get next upcoming shift
    const upcomingResult = await query(`
      SELECT s.id, s.date, j.name as job_name
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      WHERE j.client_id = $1 AND s.status = 'Upcoming' AND s.date >= CURRENT_DATE
      ORDER BY s.date ASC, s.start_time ASC
      LIMIT 1
    `, [id]);

    return {
      id: row.id,
      name: row.name,
      companyName: row.company_name || row.name,
      companyAddress: row.company_address,
      contactPerson: row.contact_person,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      // Add backward compatibility fields for the frontend
      address: row.company_address, // Map companyAddress to address for frontend
      email: row.contact_email, // Map contactEmail to email for frontend
      phone: row.contact_phone, // Map contactPhone to phone for frontend
      authorizedCrewChiefIds: crewChiefsResult.rows.map(r => r.crew_chief_id),
      mostRecentCompletedShift: recentCompletedResult.rows.length > 0 ? {
        id: recentCompletedResult.rows[0].id,
        date: recentCompletedResult.rows[0].date,
        jobName: recentCompletedResult.rows[0].job_name,
      } : undefined,
      mostRecentUpcomingShift: upcomingResult.rows.length > 0 ? {
        id: upcomingResult.rows[0].id,
        date: upcomingResult.rows[0].date,
        jobName: upcomingResult.rows[0].job_name,
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
