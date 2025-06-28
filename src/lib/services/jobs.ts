import { query } from '../db';
import type { Job } from '../types';

export async function getAllJobs(): Promise<Job[]> {
  try {
    const result = await query(`
      SELECT 
        j.id, j.name, j.description, j.client_id,
        COALESCE(c.company_name, c.name) as client_name,
        COUNT(s.id) as shift_count,
        MIN(s.date) as start_date,
        MAX(s.date) as end_date,
        CASE 
          WHEN COUNT(CASE WHEN s.status = 'Completed' THEN 1 END) = COUNT(s.id) AND COUNT(s.id) > 0 THEN 'Completed'
          WHEN COUNT(CASE WHEN s.status IN ('In Progress', 'Upcoming') THEN 1 END) > 0 THEN 'Active'
          ELSE 'Planning'
        END as status
      FROM jobs j
      JOIN users c ON j.client_id = c.id AND c.role = 'Client'
      LEFT JOIN shifts s ON j.id = s.job_id
      GROUP BY j.id, j.name, j.description, j.client_id, c.name, c.company_name
      ORDER BY j.created_at DESC
    `);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      clientId: row.client_id,
      clientName: row.client_name,
      shiftCount: parseInt(row.shift_count) || 0,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
    }));
  } catch (error) {
    console.error('Error getting all jobs:', error);
    return [];
  }
}

export async function getJobById(id: string): Promise<Job | null> {
  try {
    const result = await query(`
      SELECT
        j.id, j.name, j.description, j.client_id,
        COALESCE(c.company_name, c.name) as client_name,
        COUNT(s.id) as shift_count,
        MIN(s.date) as start_date,
        MAX(s.date) as end_date,
        CASE
          WHEN COUNT(CASE WHEN s.status = 'Completed' THEN 1 END) = COUNT(s.id) AND COUNT(s.id) > 0 THEN 'Completed'
          WHEN COUNT(CASE WHEN s.status IN ('In Progress', 'Upcoming') THEN 1 END) > 0 THEN 'Active'
          ELSE 'Planning'
        END as status
      FROM jobs j
      JOIN users c ON j.client_id = c.id AND c.role = 'Client'
      LEFT JOIN shifts s ON j.id = s.job_id
      WHERE j.id = $1
      GROUP BY j.id, j.name, j.description, j.client_id, c.name, c.company_name
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      clientId: row.client_id,
      clientName: row.client_name,
      shiftCount: parseInt(row.shift_count) || 0,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
    };
  } catch (error) {
    console.error('Error getting job by ID:', error);
    return null;
  }
}

export async function getJobsByClientId(clientId: string): Promise<Job[]> {
  try {
    const result = await query(`
      SELECT 
        j.id, j.name, j.description, j.client_id,
        COALESCE(c.company_name, c.name) as client_name,
        COUNT(s.id) as shift_count,
        MIN(s.date) as start_date,
        MAX(s.date) as end_date,
        CASE
          WHEN COUNT(CASE WHEN s.status = 'Completed' THEN 1 END) = COUNT(s.id) AND COUNT(s.id) > 0 THEN 'Completed'
          WHEN COUNT(CASE WHEN s.status IN ('In Progress', 'Upcoming') THEN 1 END) > 0 THEN 'Active'
          ELSE 'Planning'
        END as status
      FROM jobs j
      JOIN users c ON j.client_id = c.id AND c.role = 'Client'
      LEFT JOIN shifts s ON j.id = s.job_id
      WHERE j.client_id = $1
      GROUP BY j.id, j.name, j.description, j.client_id, c.name, c.company_name
      ORDER BY j.created_at DESC
    `, [clientId]);

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      clientId: row.client_id,
      clientName: row.client_name,
      shiftCount: parseInt(row.shift_count) || 0,
      recentShiftCount: parseInt(row.shift_count) || 0, // For compatibility with client details page
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
    }));
  } catch (error) {
    console.error('Error getting jobs by client ID:', error);
    return [];
  }
}

export async function createJob(jobData: Omit<Job, 'id' | 'clientName' | 'shiftCount' | 'startDate' | 'endDate' | 'status'>): Promise<Job | null> {
  try {
    const result = await query(`
      INSERT INTO jobs (name, description, client_id)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [
      jobData.name,
      jobData.description,
      jobData.clientId
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return await getJobById(result.rows[0].id);
  } catch (error) {
    console.error('Error creating job:', error);
    return null;
  }
}

export async function updateJob(id: string, jobData: Partial<Omit<Job, 'id' | 'clientName' | 'shiftCount' | 'startDate' | 'endDate' | 'status'>>): Promise<Job | null> {
  try {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (jobData.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(jobData.name);
    }
    if (jobData.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(jobData.description);
    }
    if (jobData.clientId !== undefined) {
      fields.push(`client_id = $${paramCount++}`);
      values.push(jobData.clientId);
    }

    if (fields.length === 0) {
      return await getJobById(id);
    }

    values.push(id);
    await query(`
      UPDATE jobs 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
    `, values);

    return await getJobById(id);
  } catch (error) {
    console.error('Error updating job:', error);
    return null;
  }
}

export async function deleteJob(id: string): Promise<boolean> {
  try {
    const result = await query('DELETE FROM jobs WHERE id = $1', [id]);
    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error('Error deleting job:', error);
    return false;
  }
}
