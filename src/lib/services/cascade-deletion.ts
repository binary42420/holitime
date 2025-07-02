import { query } from '../db';

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
 * Delete a client company and all associated data in proper cascade order
 */
export async function deleteClientCompanyCascade(clientId: string, deletedByUserId: string): Promise<DeletionResult> {
  const client = await query('BEGIN');
  
  try {
    // First, get client info for logging
    const clientResult = await query('SELECT company_name FROM clients WHERE id = $1', [clientId]);
    if (clientResult.rows.length === 0) {
      await query('ROLLBACK');
      return {
        success: false,
        message: 'Client company not found',
        deletedCounts: {},
        error: 'Client company does not exist'
      };
    }
    
    const clientName = clientResult.rows[0].company_name;
    const deletedCounts: DeletionResult['deletedCounts'] = {};
    
    // Step 1: Get all jobs for this client
    const jobsResult = await query('SELECT id FROM jobs WHERE client_id = $1', [clientId]);
    const jobIds = jobsResult.rows.map(row => row.id);
    
    if (jobIds.length > 0) {
      // Step 2: Get all shifts for these jobs
      const shiftsResult = await query(
        'SELECT id FROM shifts WHERE job_id = ANY($1)',
        [jobIds]
      );
      const shiftIds = shiftsResult.rows.map(row => row.id);
      
      if (shiftIds.length > 0) {
        // Step 3: Get all assigned personnel for these shifts
        const assignedResult = await query(
          'SELECT id FROM assigned_personnel WHERE shift_id = ANY($1)',
          [shiftIds]
        );
        const assignedIds = assignedResult.rows.map(row => row.id);
        
        if (assignedIds.length > 0) {
          // Step 4: Delete time entries
          const timeEntriesResult = await query(
            'DELETE FROM time_entries WHERE assigned_personnel_id = ANY($1)',
            [assignedIds]
          );
          deletedCounts.timeEntries = timeEntriesResult.rowCount || 0;
          
          // Step 5: Delete assigned personnel
          const assignedDeleteResult = await query(
            'DELETE FROM assigned_personnel WHERE id = ANY($1)',
            [assignedIds]
          );
          deletedCounts.assignedPersonnel = assignedDeleteResult.rowCount || 0;
        }
        
        // Step 6: Delete crew chief permissions for these shifts
        const permissionsResult = await query(
          'DELETE FROM crew_chief_permissions WHERE permission_type = $1 AND target_id = ANY($2)',
          ['shift', shiftIds]
        );
        deletedCounts.crewChiefPermissions = (deletedCounts.crewChiefPermissions || 0) + (permissionsResult.rowCount || 0);
        
        // Step 7: Delete shifts
        const shiftsDeleteResult = await query(
          'DELETE FROM shifts WHERE id = ANY($1)',
          [shiftIds]
        );
        deletedCounts.shifts = shiftsDeleteResult.rowCount || 0;
      }
      
      // Step 8: Delete crew chief permissions for these jobs
      const jobPermissionsResult = await query(
        'DELETE FROM crew_chief_permissions WHERE permission_type = $1 AND target_id = ANY($2)',
        ['job', jobIds]
      );
      deletedCounts.crewChiefPermissions = (deletedCounts.crewChiefPermissions || 0) + (jobPermissionsResult.rowCount || 0);
      
      // Step 9: Delete jobs
      const jobsDeleteResult = await query(
        'DELETE FROM jobs WHERE id = ANY($1)',
        [jobIds]
      );
      deletedCounts.jobs = jobsDeleteResult.rowCount || 0;
    }
    
    // Step 10: Delete crew chief permissions for this client
    const clientPermissionsResult = await query(
      'DELETE FROM crew_chief_permissions WHERE permission_type = $1 AND target_id = $2',
      ['client', clientId]
    );
    deletedCounts.crewChiefPermissions = (deletedCounts.crewChiefPermissions || 0) + (clientPermissionsResult.rowCount || 0);
    
    // Step 11: Update users to remove client_company_id reference
    const usersUpdateResult = await query(
      'UPDATE users SET client_company_id = NULL WHERE client_company_id = $1',
      [clientId]
    );
    deletedCounts.users = usersUpdateResult.rowCount || 0;
    
    // Step 12: Delete the client company
    const clientDeleteResult = await query(
      'DELETE FROM clients WHERE id = $1',
      [clientId]
    );
    deletedCounts.clientCompanies = clientDeleteResult.rowCount || 0;
    
    // Log the deletion
    await query(
      'INSERT INTO audit_log (action, entity_type, entity_id, entity_name, performed_by, details) VALUES ($1, $2, $3, $4, $5, $6)',
      ['DELETE_CASCADE', 'client_company', clientId, clientName, deletedByUserId, JSON.stringify(deletedCounts)]
    );
    
    await query('COMMIT');
    
    return {
      success: true,
      message: `Successfully deleted client company "${clientName}" and all associated data`,
      deletedCounts
    };
    
  } catch (error) {
    await query('ROLLBACK');
    console.error('Error in client company cascade deletion:', error);
    return {
      success: false,
      message: 'Failed to delete client company',
      deletedCounts: {},
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete a job and all associated data in proper cascade order
 */
export async function deleteJobCascade(jobId: string, deletedByUserId: string): Promise<DeletionResult> {
  const client = await query('BEGIN');
  
  try {
    // First, get job info for logging
    const jobResult = await query('SELECT name FROM jobs WHERE id = $1', [jobId]);
    if (jobResult.rows.length === 0) {
      await query('ROLLBACK');
      return {
        success: false,
        message: 'Job not found',
        deletedCounts: {},
        error: 'Job does not exist'
      };
    }
    
    const jobName = jobResult.rows[0].name;
    const deletedCounts: DeletionResult['deletedCounts'] = {};
    
    // Step 1: Get all shifts for this job
    const shiftsResult = await query('SELECT id FROM shifts WHERE job_id = $1', [jobId]);
    const shiftIds = shiftsResult.rows.map(row => row.id);
    
    if (shiftIds.length > 0) {
      // Step 2: Get all assigned personnel for these shifts
      const assignedResult = await query(
        'SELECT id FROM assigned_personnel WHERE shift_id = ANY($1)',
        [shiftIds]
      );
      const assignedIds = assignedResult.rows.map(row => row.id);
      
      if (assignedIds.length > 0) {
        // Step 3: Delete time entries
        const timeEntriesResult = await query(
          'DELETE FROM time_entries WHERE assigned_personnel_id = ANY($1)',
          [assignedIds]
        );
        deletedCounts.timeEntries = timeEntriesResult.rowCount || 0;
        
        // Step 4: Delete assigned personnel
        const assignedDeleteResult = await query(
          'DELETE FROM assigned_personnel WHERE id = ANY($1)',
          [assignedIds]
        );
        deletedCounts.assignedPersonnel = assignedDeleteResult.rowCount || 0;
      }
      
      // Step 5: Delete crew chief permissions for these shifts
      const permissionsResult = await query(
        'DELETE FROM crew_chief_permissions WHERE permission_type = $1 AND target_id = ANY($2)',
        ['shift', shiftIds]
      );
      deletedCounts.crewChiefPermissions = (deletedCounts.crewChiefPermissions || 0) + (permissionsResult.rowCount || 0);
      
      // Step 6: Delete shifts
      const shiftsDeleteResult = await query(
        'DELETE FROM shifts WHERE id = ANY($1)',
        [shiftIds]
      );
      deletedCounts.shifts = shiftsDeleteResult.rowCount || 0;
    }
    
    // Step 7: Delete crew chief permissions for this job
    const jobPermissionsResult = await query(
      'DELETE FROM crew_chief_permissions WHERE permission_type = $1 AND target_id = $2',
      ['job', jobId]
    );
    deletedCounts.crewChiefPermissions = (deletedCounts.crewChiefPermissions || 0) + (jobPermissionsResult.rowCount || 0);
    
    // Step 8: Delete the job
    const jobDeleteResult = await query(
      'DELETE FROM jobs WHERE id = $1',
      [jobId]
    );
    deletedCounts.jobs = jobDeleteResult.rowCount || 0;
    
    // Log the deletion
    await query(
      'INSERT INTO audit_log (action, entity_type, entity_id, entity_name, performed_by, details) VALUES ($1, $2, $3, $4, $5, $6)',
      ['DELETE_CASCADE', 'job', jobId, jobName, deletedByUserId, JSON.stringify(deletedCounts)]
    );
    
    await query('COMMIT');
    
    return {
      success: true,
      message: `Successfully deleted job "${jobName}" and all associated data`,
      deletedCounts
    };
    
  } catch (error) {
    await query('ROLLBACK');
    console.error('Error in job cascade deletion:', error);
    return {
      success: false,
      message: 'Failed to delete job',
      deletedCounts: {},
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete a shift and all associated data in proper cascade order
 */
export async function deleteShiftCascade(shiftId: string, deletedByUserId: string): Promise<DeletionResult> {
  const client = await query('BEGIN');

  try {
    // First, get shift info for logging
    const shiftResult = await query(`
      SELECT s.date, s.start_time, j.name as job_name
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      WHERE s.id = $1
    `, [shiftId]);

    if (shiftResult.rows.length === 0) {
      await query('ROLLBACK');
      return {
        success: false,
        message: 'Shift not found',
        deletedCounts: {},
        error: 'Shift does not exist'
      };
    }

    const shift = shiftResult.rows[0];
    const shiftName = `${shift.job_name} - ${shift.date} ${shift.start_time}`;
    const deletedCounts: DeletionResult['deletedCounts'] = {};

    // Step 1: Get all assigned personnel for this shift
    const assignedResult = await query(
      'SELECT id FROM assigned_personnel WHERE shift_id = $1',
      [shiftId]
    );
    const assignedIds = assignedResult.rows.map(row => row.id);

    if (assignedIds.length > 0) {
      // Step 2: Delete time entries
      const timeEntriesResult = await query(
        'DELETE FROM time_entries WHERE assigned_personnel_id = ANY($1)',
        [assignedIds]
      );
      deletedCounts.timeEntries = timeEntriesResult.rowCount || 0;

      // Step 3: Delete assigned personnel
      const assignedDeleteResult = await query(
        'DELETE FROM assigned_personnel WHERE id = ANY($1)',
        [assignedIds]
      );
      deletedCounts.assignedPersonnel = assignedDeleteResult.rowCount || 0;
    }

    // Step 4: Delete crew chief permissions for this shift
    const permissionsResult = await query(
      'DELETE FROM crew_chief_permissions WHERE permission_type = $1 AND target_id = $2',
      ['shift', shiftId]
    );
    deletedCounts.crewChiefPermissions = permissionsResult.rowCount || 0;

    // Step 5: Delete the shift
    const shiftDeleteResult = await query(
      'DELETE FROM shifts WHERE id = $1',
      [shiftId]
    );
    deletedCounts.shifts = shiftDeleteResult.rowCount || 0;

    // Log the deletion
    await query(
      'INSERT INTO audit_log (action, entity_type, entity_id, entity_name, performed_by, details) VALUES ($1, $2, $3, $4, $5, $6)',
      ['DELETE_CASCADE', 'shift', shiftId, shiftName, deletedByUserId, JSON.stringify(deletedCounts)]
    );

    await query('COMMIT');

    return {
      success: true,
      message: `Successfully deleted shift "${shiftName}" and all associated data`,
      deletedCounts
    };

  } catch (error) {
    await query('ROLLBACK');
    console.error('Error in shift cascade deletion:', error);
    return {
      success: false,
      message: 'Failed to delete shift',
      deletedCounts: {},
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get deletion impact summary before performing cascade deletion
 */
export async function getDeletionImpact(entityType: 'client' | 'job' | 'shift', entityId: string) {
  try {
    let impact = {
      timeEntries: 0,
      assignedPersonnel: 0,
      shifts: 0,
      jobs: 0,
      crewChiefPermissions: 0,
      users: 0
    };

    if (entityType === 'client') {
      // Get impact for client deletion
      const result = await query(`
        SELECT
          COUNT(DISTINCT te.id) as time_entries,
          COUNT(DISTINCT ap.id) as assigned_personnel,
          COUNT(DISTINCT s.id) as shifts,
          COUNT(DISTINCT j.id) as jobs,
          COUNT(DISTINCT ccp.id) as crew_chief_permissions,
          COUNT(DISTINCT u.id) as users
        FROM clients c
        LEFT JOIN jobs j ON c.id = j.client_id
        LEFT JOIN shifts s ON j.id = s.job_id
        LEFT JOIN assigned_personnel ap ON s.id = ap.shift_id
        LEFT JOIN time_entries te ON ap.id = te.assigned_personnel_id
        LEFT JOIN crew_chief_permissions ccp ON (
          (ccp.permission_type = 'client' AND ccp.target_id = c.id) OR
          (ccp.permission_type = 'job' AND ccp.target_id = j.id) OR
          (ccp.permission_type = 'shift' AND ccp.target_id = s.id)
        )
        LEFT JOIN users u ON u.client_company_id = c.id
        WHERE c.id = $1 AND ccp.revoked_at IS NULL
      `, [entityId]);

      if (result.rows.length > 0) {
        const row = result.rows[0];
        impact = {
          timeEntries: parseInt(row.time_entries) || 0,
          assignedPersonnel: parseInt(row.assigned_personnel) || 0,
          shifts: parseInt(row.shifts) || 0,
          jobs: parseInt(row.jobs) || 0,
          crewChiefPermissions: parseInt(row.crew_chief_permissions) || 0,
          users: parseInt(row.users) || 0
        };
      }
    } else if (entityType === 'job') {
      // Get impact for job deletion
      const result = await query(`
        SELECT
          COUNT(DISTINCT te.id) as time_entries,
          COUNT(DISTINCT ap.id) as assigned_personnel,
          COUNT(DISTINCT s.id) as shifts,
          COUNT(DISTINCT ccp.id) as crew_chief_permissions
        FROM jobs j
        LEFT JOIN shifts s ON j.id = s.job_id
        LEFT JOIN assigned_personnel ap ON s.id = ap.shift_id
        LEFT JOIN time_entries te ON ap.id = te.assigned_personnel_id
        LEFT JOIN crew_chief_permissions ccp ON (
          (ccp.permission_type = 'job' AND ccp.target_id = j.id) OR
          (ccp.permission_type = 'shift' AND ccp.target_id = s.id)
        )
        WHERE j.id = $1 AND ccp.revoked_at IS NULL
      `, [entityId]);

      if (result.rows.length > 0) {
        const row = result.rows[0];
        impact = {
          timeEntries: parseInt(row.time_entries) || 0,
          assignedPersonnel: parseInt(row.assigned_personnel) || 0,
          shifts: parseInt(row.shifts) || 0,
          jobs: 1,
          crewChiefPermissions: parseInt(row.crew_chief_permissions) || 0,
          users: 0
        };
      }
    } else if (entityType === 'shift') {
      // Get impact for shift deletion
      const result = await query(`
        SELECT
          COUNT(DISTINCT te.id) as time_entries,
          COUNT(DISTINCT ap.id) as assigned_personnel,
          COUNT(DISTINCT ccp.id) as crew_chief_permissions
        FROM shifts s
        LEFT JOIN assigned_personnel ap ON s.id = ap.shift_id
        LEFT JOIN time_entries te ON ap.id = te.assigned_personnel_id
        LEFT JOIN crew_chief_permissions ccp ON ccp.permission_type = 'shift' AND ccp.target_id = s.id
        WHERE s.id = $1 AND ccp.revoked_at IS NULL
      `, [entityId]);

      if (result.rows.length > 0) {
        const row = result.rows[0];
        impact = {
          timeEntries: parseInt(row.time_entries) || 0,
          assignedPersonnel: parseInt(row.assigned_personnel) || 0,
          shifts: 1,
          jobs: 0,
          crewChiefPermissions: parseInt(row.crew_chief_permissions) || 0,
          users: 0
        };
      }
    }

    return impact;
  } catch (error) {
    console.error('Error getting deletion impact:', error);
    return {
      timeEntries: 0,
      assignedPersonnel: 0,
      shifts: 0,
      jobs: 0,
      crewChiefPermissions: 0,
      users: 0
    };
  }
}
