import { query } from "../db"
import type { WorkerRequirement, RoleCode } from "../types"

export async function getWorkerRequirements(shiftId: string): Promise<WorkerRequirement[]> {
  try {
    const result = await query(`
      SELECT role_code, required_count
      FROM worker_requirements
      WHERE shift_id = $1
      ORDER BY role_code
    `, [shiftId])

    return result.rows.map(row => ({
      roleCode: row.role_code,
      requiredCount: parseInt(row.required_count)
    }))
  } catch (error) {
    console.error("Error getting worker requirements:", error)
    return []
  }
}

export async function updateWorkerRequirements(
  shiftId: string,
  requirements: WorkerRequirement[]
): Promise<boolean> {
  try {
    // Start a transaction since we're doing multiple operations
    await query("BEGIN")

    // Delete existing requirements for this shift
    await query(`
      DELETE FROM worker_requirements
      WHERE shift_id = $1
    `, [shiftId])

    // Insert new requirements
    for (const req of requirements) {
      await query(`
        INSERT INTO worker_requirements (shift_id, role_code, required_count)
        VALUES ($1, $2, $3)
        ON CONFLICT (shift_id, role_code) 
        DO UPDATE SET required_count = EXCLUDED.required_count
      `, [shiftId, req.roleCode, req.requiredCount])
    }

    // Calculate and update total requested workers on shifts table
    await query(`
      UPDATE shifts 
      SET requested_workers = (
        SELECT SUM(required_count)
        FROM worker_requirements
        WHERE shift_id = $1
      )
      WHERE id = $1
    `, [shiftId])

    await query("COMMIT")
    return true
  } catch (error) {
    await query("ROLLBACK")
    console.error("Error updating worker requirements:", error)
    return false
  }
}
