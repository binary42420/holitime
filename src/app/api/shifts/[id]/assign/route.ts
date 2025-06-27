import { NextRequest, NextResponse } from 'next/server'
import { getPool } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shiftId } = await params
    const body = await request.json()
    const { employeeId, roleCode, roleOnShift } = body

    console.log('Assignment request:', { shiftId, employeeId, roleCode, roleOnShift })

    if (!employeeId || !roleCode || !roleOnShift) {
      console.error('Missing required fields:', { employeeId, roleCode, roleOnShift })
      return NextResponse.json(
        { error: 'Employee ID, role code, and role on shift are required' },
        { status: 400 }
      )
    }

    const pool = getPool()

    // Find the employee record for this user
    const employeeQuery = await pool.query(
      'SELECT e.id, u.name FROM employees e JOIN users u ON e.user_id = u.id WHERE u.id = $1',
      [employeeId]
    )

    console.log('Employee query result:', employeeQuery.rows)

    if (employeeQuery.rows.length === 0) {
      console.error('Employee not found for user ID:', employeeId)
      return NextResponse.json(
        { error: 'Employee record not found for this user' },
        { status: 404 }
      )
    }

    const employee = employeeQuery.rows[0]
    const actualEmployeeId = employee.id

    // Check if the employee is already assigned to this shift
    const existingAssignment = await pool.query(
      'SELECT id FROM assigned_personnel WHERE shift_id = $1 AND employee_id = $2',
      [shiftId, actualEmployeeId]
    )

    console.log('Existing assignment check:', existingAssignment.rows)

    if (existingAssignment.rows.length > 0) {
      console.error('Employee already assigned:', { shiftId, actualEmployeeId })
      return NextResponse.json(
        { error: 'Employee is already assigned to this shift' },
        { status: 400 }
      )
    }

    // Check if the shift exists
    const shiftCheck = await pool.query(
      'SELECT id FROM shifts WHERE id = $1',
      [shiftId]
    )

    if (shiftCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      )
    }

    // Insert the assignment
    const result = await pool.query(
      `INSERT INTO assigned_personnel
       (shift_id, employee_id, role_on_shift, role_code, status, is_placeholder)
       VALUES ($1, $2, $3, $4, 'Clocked Out', false)
       RETURNING id`,
      [shiftId, actualEmployeeId, roleOnShift, roleCode]
    )

    const assignmentId = result.rows[0].id

    return NextResponse.json({
      success: true,
      assignment: {
        id: assignmentId,
        shiftId,
        employeeId: actualEmployeeId,
        userId: employeeId,
        roleOnShift,
        roleCode,
        status: 'Clocked Out'
      }
    })

  } catch (error) {
    console.error('Error assigning worker to shift:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
