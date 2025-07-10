import { withTransaction } from '../db';
import { PoolClient } from 'pg';

export interface DeletionResult {
  success: boolean;
  message: string;
  deletedCounts: {
    timeEntries?: number;
    assignedPersonnel?: number;
    shifts?: number;
    jobs?: number;
    clientCompanies?: number;
    crewChiefPermissions?: number;
    users?: number;
  };
  error?: string;
}

/**
 * Deletes a client company and all associated data within a single transaction.
 * NOTE: This function assumes the database schema does NOT have `ON DELETE CASCADE`
 * for foreign keys. The most robust solution is to add cascading deletes to the
 * database schema itself, which would dramatically simplify this code.
 */
export async function deleteClientCompanyCascade(clientId: string, deletedByUserId: string): Promise<DeletionResult> {
  return withTransaction(async (client: PoolClient) => {
    const clientResult = await client.query('SELECT company_name FROM clients WHERE id = $1', [clientId]);
    if (clientResult.rows.length === 0) {
      throw new Error('Client company not found');
    }
    const clientName = clientResult.rows[0].company_name;
    const deletedCounts: DeletionResult['deletedCounts'] = {};

    // Get related job and shift IDs
    const jobsResult = await client.query('SELECT id FROM jobs WHERE client_id = $1', [clientId]);
    const jobIds = jobsResult.rows.map(row => row.id);

    if (jobIds.length > 0) {
      const shiftsResult = await client.query('SELECT id FROM shifts WHERE job_id = ANY($1::uuid[])', [jobIds]);
      const shiftIds = shiftsResult.rows.map(row => row.id);

      if (shiftIds.length > 0) {
        // This is the deepest level, delete from here upwards
        deletedCounts.timeEntries = (await client.query('DELETE FROM time_entries WHERE assigned_personnel_id IN (SELECT id FROM assigned_personnel WHERE shift_id = ANY($1::uuid[]))', [shiftIds])).rowCount || 0;
        deletedCounts.assignedPersonnel = (await client.query('DELETE FROM assigned_personnel WHERE shift_id = ANY($1::uuid[])', [shiftIds])).rowCount || 0;
        deletedCounts.crewChiefPermissions = (await client.query('DELETE FROM crew_chief_permissions WHERE permission_type = \'shift\' AND target_id = ANY($1::uuid[])', [shiftIds])).rowCount || 0;
        deletedCounts.shifts = (await client.query('DELETE FROM shifts WHERE id = ANY($1::uuid[])', [shiftIds])).rowCount || 0;
      }
      
      deletedCounts.crewChiefPermissions = (deletedCounts.crewChiefPermissions || 0) + (await client.query('DELETE FROM crew_chief_permissions WHERE permission_type = \'job\' AND target_id = ANY($1::uuid[])', [jobIds])).rowCount || 0;
      deletedCounts.jobs = (await client.query('DELETE FROM jobs WHERE id = ANY($1::uuid[])', [jobIds])).rowCount || 0;
    }

    deletedCounts.crewChiefPermissions = (deletedCounts.crewChiefPermissions || 0) + (await client.query('DELETE FROM crew_chief_permissions WHERE permission_type = \'client\' AND target_id = $1', [clientId])).rowCount || 0;
    deletedCounts.users = (await client.query('UPDATE users SET client_company_id = NULL WHERE client_company_id = $1', [clientId])).rowCount || 0;
    deletedCounts.clientCompanies = (await client.query('DELETE FROM clients WHERE id = $1', [clientId])).rowCount || 0;

    // Log the deletion
    await client.query(
      'INSERT INTO audit_log (action, entity_type, entity_id, entity_name, performed_by, details) VALUES ($1, $2, $3, $4, $5, $6)',
      ['DELETE_CASCADE', 'client_company', clientId, clientName, deletedByUserId, JSON.stringify(deletedCounts)]
    );

    return {
      success: true,
      message: `Successfully deleted client company "${clientName}" and all associated data.`,
      deletedCounts,
    };
  }).catch(error => {
    console.error(`Error in client company cascade deletion for client ID ${clientId}:`, error);
    return {
      success: false,
      message: 'Failed to delete client company due to a server error.',
      deletedCounts: {},
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  });
}

/**
 * Deletes a job and all associated data within a single transaction.
 * Recommends using `ON DELETE CASCADE` in the database schema for simplification.
 */
export async function deleteJobCascade(jobId: string, deletedByUserId: string): Promise<DeletionResult> {
  return withTransaction(async (client: PoolClient) => {
    const jobResult = await client.query('SELECT name FROM jobs WHERE id = $1', [jobId]);
    if (jobResult.rows.length === 0) {
      throw new Error('Job not found');
    }
    const jobName = jobResult.rows[0].name;
    const deletedCounts: DeletionResult['deletedCounts'] = {};

    const shiftsResult = await client.query('SELECT id FROM shifts WHERE job_id = $1', [jobId]);
    const shiftIds = shiftsResult.rows.map(row => row.id);

    if (shiftIds.length > 0) {
      deletedCounts.timeEntries = (await client.query('DELETE FROM time_entries WHERE assigned_personnel_id IN (SELECT id FROM assigned_personnel WHERE shift_id = ANY($1::uuid[]))', [shiftIds])).rowCount || 0;
      deletedCounts.assignedPersonnel = (await client.query('DELETE FROM assigned_personnel WHERE shift_id = ANY($1::uuid[])', [shiftIds])).rowCount || 0;
      deletedCounts.crewChiefPermissions = (await client.query('DELETE FROM crew_chief_permissions WHERE permission_type = \'shift\' AND target_id = ANY($1::uuid[])', [shiftIds])).rowCount || 0;
      deletedCounts.shifts = (await client.query('DELETE FROM shifts WHERE id = ANY($1::uuid[])', [shiftIds])).rowCount || 0;
    }

    deletedCounts.crewChiefPermissions = (deletedCounts.crewChiefPermissions || 0) + (await client.query('DELETE FROM crew_chief_permissions WHERE permission_type = \'job\' AND target_id = $1', [jobId])).rowCount || 0;
    deletedCounts.jobs = (await client.query('DELETE FROM jobs WHERE id = $1', [jobId])).rowCount || 0;

    await client.query(
      'INSERT INTO audit_log (action, entity_type, entity_id, entity_name, performed_by, details) VALUES ($1, $2, $3, $4, $5, $6)',
      ['DELETE_CASCADE', 'job', jobId, jobName, deletedByUserId, JSON.stringify(deletedCounts)]
    );

    return {
      success: true,
      message: `Successfully deleted job "${jobName}" and all associated data.`,
      deletedCounts,
    };
  }).catch(error => {
    console.error(`Error in job cascade deletion for job ID ${jobId}:`, error);
    return {
      success: false,
      message: 'Failed to delete job due to a server error.',
      deletedCounts: {},
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  });
}

/**
 * Deletes a shift and all associated data within a single transaction.
 */
export async function deleteShiftCascade(shiftId: string, deletedByUserId: string): Promise<DeletionResult> {
  return withTransaction(async (client: PoolClient) => {
    const shiftResult = await client.query(
      'SELECT s.date, s.start_time, j.name as job_name FROM shifts s JOIN jobs j ON s.job_id = j.id WHERE s.id = $1',
      [shiftId]
    );
    if (shiftResult.rows.length === 0) {
      throw new Error('Shift not found');
    }
    const shift = shiftResult.rows[0];
    const shiftName = `${shift.job_name} - ${shift.date} ${shift.start_time}`;
    const deletedCounts: DeletionResult['deletedCounts'] = {};

    deletedCounts.timeEntries = (await client.query('DELETE FROM time_entries WHERE assigned_personnel_id IN (SELECT id FROM assigned_personnel WHERE shift_id = $1)', [shiftId])).rowCount || 0;
    deletedCounts.assignedPersonnel = (await client.query('DELETE FROM assigned_personnel WHERE shift_id = $1', [shiftId])).rowCount || 0;
    deletedCounts.crewChiefPermissions = (await client.query('DELETE FROM crew_chief_permissions WHERE permission_type = \'shift\' AND target_id = $1', [shiftId])).rowCount || 0;
    deletedCounts.shifts = (await client.query('DELETE FROM shifts WHERE id = $1', [shiftId])).rowCount || 0;

    await client.query(
      'INSERT INTO audit_log (action, entity_type, entity_id, entity_name, performed_by, details) VALUES ($1, $2, $3, $4, $5, $6)',
      ['DELETE_CASCADE', 'shift', shiftId, shiftName, deletedByUserId, JSON.stringify(deletedCounts)]
    );

    return {
      success: true,
      message: `Successfully deleted shift "${shiftName}" and all associated data.`,
      deletedCounts,
    };
  }).catch(error => {
    console.error(`Error in shift cascade deletion for shift ID ${shiftId}:`, error);
    return {
      success: false,
      message: 'Failed to delete shift due to a server error.',
      deletedCounts: {},
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  });
}

/**
 * Gets a summary of the data that will be deleted. This is a simplified
 * and more performant version of the original.
 */
export async function getDeletionImpact(entityType: 'client' | 'job' | 'shift', entityId: string) {
  // This function should be executed within a transaction to ensure a consistent view of the data.
  return withTransaction(async (client: PoolClient) => {
    const impact: DeletionResult['deletedCounts'] = {
      timeEntries: 0,
      assignedPersonnel: 0,
      shifts: 0,
      jobs: 0,
      crewChiefPermissions: 0,
      users: 0,
    };

    if (entityType === 'client') {
      const jobIdsResult = await client.query('SELECT id FROM jobs WHERE client_id = $1', [entityId]);
      const jobIds = jobIdsResult.rows.map(r => r.id);
      impact.jobs = jobIds.length;

      if (jobIds.length > 0) {
        const shiftIdsResult = await client.query('SELECT id FROM shifts WHERE job_id = ANY($1::uuid[])', [jobIds]);
        const shiftIds = shiftIdsResult.rows.map(r => r.id);
        impact.shifts = shiftIds.length;

        if (shiftIds.length > 0) {
          impact.assignedPersonnel = (await client.query('SELECT COUNT(*) FROM assigned_personnel WHERE shift_id = ANY($1::uuid[])', [shiftIds])).rows[0].count;
          impact.timeEntries = (await client.query('SELECT COUNT(*) FROM time_entries WHERE assigned_personnel_id IN (SELECT id FROM assigned_personnel WHERE shift_id = ANY($1::uuid[]))', [shiftIds])).rows[0].count;
        }
      }
      impact.users = (await client.query('SELECT COUNT(*) FROM users WHERE client_company_id = $1', [entityId])).rows[0].count;

    } else if (entityType === 'job') {
      const shiftIdsResult = await client.query('SELECT id FROM shifts WHERE job_id = $1', [entityId]);
      const shiftIds = shiftIdsResult.rows.map(r => r.id);
      impact.shifts = shiftIds.length;
      impact.jobs = 1;

      if (shiftIds.length > 0) {
        impact.assignedPersonnel = (await client.query('SELECT COUNT(*) FROM assigned_personnel WHERE shift_id = ANY($1::uuid[])', [shiftIds])).rows[0].count;
        impact.timeEntries = (await client.query('SELECT COUNT(*) FROM time_entries WHERE assigned_personnel_id IN (SELECT id FROM assigned_personnel WHERE shift_id = ANY($1::uuid[]))', [shiftIds])).rows[0].count;
      }
    } else if (entityType === 'shift') {
      impact.shifts = 1;
      impact.assignedPersonnel = (await client.query('SELECT COUNT(*) FROM assigned_personnel WHERE shift_id = $1', [entityId])).rows[0].count;
      impact.timeEntries = (await client.query('SELECT COUNT(*) FROM time_entries WHERE assigned_personnel_id IN (SELECT id FROM assigned_personnel WHERE shift_id = $1)', [entityId])).rows[0].count;
    }

    // Note: crewChiefPermissions impact is complex to calculate accurately without deleting.
    // This part is omitted for simplicity as the main counts are more critical.
    return impact;
  }).catch(error => {
    console.error(`Error getting deletion impact for ${entityType} ID ${entityId}:`, error);
    return { timeEntries: -1, assignedPersonnel: -1, shifts: -1, jobs: -1, crewChiefPermissions: -1, users: -1 };
  });
}
