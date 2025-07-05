import { query } from "../db"
import type { Employee } from "../types"

export async function getAllEmployees(): Promise<Employee[]> {
  try {
    const result = await query(`
      SELECT e.id, u.name, e.certifications, e.performance, e.location, u.avatar
      FROM employees e
      JOIN users u ON e.user_id = u.id
      WHERE u.is_active = true
      ORDER BY u.name
    `)

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      certifications: row.certifications || [],
      performance: parseFloat(row.performance) || 0,
      location: row.location || "",
      avatar: row.avatar || "",
    }))
  } catch (error) {
    console.error("Error getting all employees:", error)
    return []
  }
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  try {
    const result = await query(`
      SELECT e.id, u.name, e.certifications, e.performance, e.location, u.avatar
      FROM employees e
      JOIN users u ON e.user_id = u.id
      WHERE e.id = $1 AND u.is_active = true
    `, [id])

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      id: row.id,
      name: row.name,
      certifications: row.certifications || [],
      performance: parseFloat(row.performance) || 0,
      location: row.location || "",
      avatar: row.avatar || "",
    }
  } catch (error) {
    console.error("Error getting employee by ID:", error)
    return null
  }
}

export async function getEmployeeByUserId(userId: string): Promise<Employee | null> {
  try {
    const result = await query(`
      SELECT e.id, u.name, e.certifications, e.performance, e.location, u.avatar
      FROM employees e
      JOIN users u ON e.user_id = u.id
      WHERE e.user_id = $1 AND u.is_active = true
    `, [userId])

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0]
    return {
      id: row.id,
      name: row.name,
      certifications: row.certifications || [],
      performance: parseFloat(row.performance) || 0,
      location: row.location || "",
      avatar: row.avatar || "",
    }
  } catch (error) {
    console.error("Error getting employee by user ID:", error)
    return null
  }
}

export async function createEmployee(userId: string, employeeData: Omit<Employee, "id" | "name" | "avatar">): Promise<Employee | null> {
  try {
    const result = await query(`
      INSERT INTO employees (user_id, certifications, performance, location)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [
      userId,
      employeeData.certifications,
      employeeData.performance,
      employeeData.location
    ])

    if (result.rows.length === 0) {
      return null
    }

    return await getEmployeeById(result.rows[0].id)
  } catch (error) {
    console.error("Error creating employee:", error)
    return null
  }
}

export async function updateEmployee(id: string, employeeData: Partial<Omit<Employee, "id" | "name" | "avatar">>): Promise<Employee | null> {
  try {
    const fields = []
    const values = []
    let paramCount = 1

    if (employeeData.certifications !== undefined) {
      fields.push(`certifications = $${paramCount++}`)
      values.push(employeeData.certifications)
    }
    if (employeeData.performance !== undefined) {
      fields.push(`performance = $${paramCount++}`)
      values.push(employeeData.performance)
    }
    if (employeeData.location !== undefined) {
      fields.push(`location = $${paramCount++}`)
      values.push(employeeData.location)
    }

    if (fields.length === 0) {
      return await getEmployeeById(id)
    }

    values.push(id)
    const result = await query(`
      UPDATE employees 
      SET ${fields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id
    `, values)

    if (result.rows.length === 0) {
      return null
    }

    return await getEmployeeById(id)
  } catch (error) {
    console.error("Error updating employee:", error)
    return null
  }
}

export async function deleteEmployee(id: string): Promise<boolean> {
  try {
    const result = await query("DELETE FROM employees WHERE id = $1", [id])
    return (result.rowCount || 0) > 0
  } catch (error) {
    console.error("Error deleting employee:", error)
    return false
  }
}

// Get employees by location
export async function getEmployeesByLocation(location: string): Promise<Employee[]> {
  try {
    const result = await query(`
      SELECT e.id, u.name, e.certifications, e.performance, e.location, u.avatar
      FROM employees e
      JOIN users u ON e.user_id = u.id
      WHERE e.location = $1 AND u.is_active = true
      ORDER BY u.name
    `, [location])

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      certifications: row.certifications || [],
      performance: parseFloat(row.performance) || 0,
      location: row.location || "",
      avatar: row.avatar || "",
    }))
  } catch (error) {
    console.error("Error getting employees by location:", error)
    return []
  }
}

// Get employees with specific certifications
export async function getEmployeesWithCertifications(certifications: string[]): Promise<Employee[]> {
  try {
    const result = await query(`
      SELECT e.id, u.name, e.certifications, e.performance, e.location, u.avatar
      FROM employees e
      JOIN users u ON e.user_id = u.id
      WHERE e.certifications && $1 AND u.is_active = true
      ORDER BY e.performance DESC, u.name
    `, [certifications])

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      certifications: row.certifications || [],
      performance: parseFloat(row.performance) || 0,
      location: row.location || "",
      avatar: row.avatar || "",
    }))
  } catch (error) {
    console.error("Error getting employees with certifications:", error)
    return []
  }
}
