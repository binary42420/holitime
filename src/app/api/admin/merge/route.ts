import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/middleware';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only managers/admins can merge records
    if (user.role !== 'Manager/Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, primaryId, secondaryId, mergedData } = body;

    if (!type || !primaryId || !secondaryId || !mergedData) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (primaryId === secondaryId) {
      return NextResponse.json(
        { error: 'Cannot merge a record with itself' },
        { status: 400 }
      );
    }

    // Start transaction
    await query('BEGIN');

    try {
      let result;
      
      switch (type) {
        case 'employees':
          result = await mergeEmployees(primaryId, secondaryId, mergedData);
          break;
        case 'clients':
          result = await mergeClients(primaryId, secondaryId, mergedData);
          break;
        case 'jobs':
          result = await mergeJobs(primaryId, secondaryId, mergedData);
          break;
        default:
          throw new Error('Invalid merge type');
      }

      // Commit transaction
      await query('COMMIT');

      console.log(`Merged ${type}: ${secondaryId} into ${primaryId} by admin ${user.email}`);

      return NextResponse.json({
        success: true,
        message: `Successfully merged ${type}`,
        result,
      });
    } catch (error) {
      // Rollback transaction on error
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error merging records:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function mergeEmployees(primaryId: string, secondaryId: string, mergedData: any) {
  // Update the primary employee record
  await query(`
    UPDATE users 
    SET 
      name = $1,
      email = $2,
      role = $3,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
  `, [mergedData.name, mergedData.email, mergedData.role, primaryId]);

  // Transfer all shift assignments from secondary to primary employee
  // This is CRITICAL - we must preserve all shift assignments
  try {
    const assignedResult = await query(`
      UPDATE assigned_personnel
      SET employee_id = $1
      WHERE employee_id = $2
    `, [primaryId, secondaryId]);
    console.log(`Transferred ${assignedResult.rowCount} shift assignments from employee ${secondaryId} to ${primaryId}`);
  } catch (error: any) {
    if (!error.message.includes('does not exist')) {
      throw error;
    }
    console.log('assigned_personnel table does not exist, skipping shift assignment transfer...');
  }

  // Transfer crew chief assignments in shifts table
  try {
    const crewChiefResult = await query(`
      UPDATE shifts
      SET crew_chief_id = $1
      WHERE crew_chief_id = $2
    `, [primaryId, secondaryId]);
    console.log(`Transferred ${crewChiefResult.rowCount} crew chief assignments from employee ${secondaryId} to ${primaryId}`);
  } catch (error: any) {
    console.error('Error transferring crew chief assignments:', error);
    throw error; // This is a critical table, don't skip
  }

  // Note: time_entries are linked through assigned_personnel_id, not employee_id directly
  // So they will automatically follow the assigned_personnel records when we update employee_id above

  // Transfer any job authorizations (if table exists)
  try {
    const authResult = await query(`
      UPDATE job_authorizations
      SET crew_chief_id = $1
      WHERE crew_chief_id = $2
    `, [primaryId, secondaryId]);
    console.log(`Transferred ${authResult.rowCount} job authorizations from employee ${secondaryId} to ${primaryId}`);
  } catch (error: any) {
    if (!error.message.includes('does not exist')) {
      throw error;
    }
    console.log('job_authorizations table does not exist, skipping...');
  }

  // Delete the secondary employee record
  await query('DELETE FROM users WHERE id = $1', [secondaryId]);

  return { primaryId, mergedData };
}

async function mergeClients(primaryId: string, secondaryId: string, mergedData: any) {
  // Update the primary client record
  await query(`
    UPDATE users 
    SET 
      name = $1,
      company_name = $1,
      contact_person = $2,
      contact_email = $3,
      contact_phone = $4,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
  `, [
    mergedData.name, 
    mergedData.contactPerson, 
    mergedData.contactEmail, 
    mergedData.contactPhone, 
    primaryId
  ]);

  // Transfer all jobs from secondary to primary client
  await query(`
    UPDATE jobs 
    SET client_id = $1 
    WHERE client_id = $2
  `, [primaryId, secondaryId]);

  // Transfer any job authorizations (if table exists)
  try {
    const authResult = await query(`
      UPDATE job_authorizations ja
      SET job_id = (
        SELECT j.id FROM jobs j WHERE j.client_id = $1
        AND j.name = (SELECT j2.name FROM jobs j2 WHERE j2.id = ja.job_id)
        LIMIT 1
      )
      FROM jobs j_secondary
      WHERE j_secondary.client_id = $2
      AND ja.job_id = j_secondary.id
    `, [primaryId, secondaryId]);
    console.log(`Transferred ${authResult.rowCount} job authorizations for client ${secondaryId} to ${primaryId}`);
  } catch (error: any) {
    if (!error.message.includes('does not exist')) {
      throw error;
    }
    console.log('job_authorizations table does not exist, skipping...');
  }

  // Delete the secondary client record
  await query('DELETE FROM users WHERE id = $1', [secondaryId]);

  return { primaryId, mergedData };
}

async function mergeJobs(primaryId: string, secondaryId: string, mergedData: any) {
  // Update the primary job record
  await query(`
    UPDATE jobs
    SET
      name = $1,
      description = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
  `, [mergedData.name, mergedData.description, primaryId]);

  // Transfer all shifts from secondary to primary job
  await query(`
    UPDATE shifts
    SET job_id = $1
    WHERE job_id = $2
  `, [primaryId, secondaryId]);

  // Transfer job authorizations (if table exists)
  try {
    await query(`
      UPDATE job_authorizations
      SET job_id = $1
      WHERE job_id = $2
    `, [primaryId, secondaryId]);
  } catch (error: any) {
    if (!error.message.includes('does not exist')) {
      throw error;
    }
    console.log('job_authorizations table does not exist, skipping...');
  }

  // Delete the secondary job record
  await query('DELETE FROM jobs WHERE id = $1', [secondaryId]);

  return { primaryId, mergedData };
}
