import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { getShiftById } from '@/lib/services/shifts'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const companySlug = searchParams.get('company')
    const jobSlug = searchParams.get('job')
    const dateSlug = searchParams.get('date')

    if (!companySlug || !jobSlug || !dateSlug) {
      return NextResponse.json(
        { error: 'Company, job, and date parameters are required' },
        { status: 400 }
      )
    }

    // Convert URL-friendly slugs back to searchable terms
    const companyName = decodeURIComponent(companySlug).replace(/-/g, ' ')
    const jobName = decodeURIComponent(jobSlug).replace(/-/g, ' ')
    const shiftDate = decodeURIComponent(dateSlug)

    console.log('Looking for shift with:', { companyName, jobName, shiftDate })

    // Find the shift by company name, job name, and date using fuzzy matching
    const result = await query(`
      SELECT s.id, c.name as client_name, j.name as job_name, s.date
      FROM shifts s
      JOIN jobs j ON s.job_id = j.id
      JOIN clients c ON j.client_id = c.id
      WHERE LOWER(REPLACE(c.name, '.', '')) LIKE LOWER($1)
        AND LOWER(REPLACE(j.name, '.', '')) LIKE LOWER($2)
        AND s.date = $3
      LIMIT 1
    `, [`%${companyName}%`, `%${jobName}%`, shiftDate])

    console.log('Query result:', result.rows)

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      )
    }

    const shiftId = result.rows[0].id
    const shift = await getShiftById(shiftId)

    if (!shift) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this shift
    const hasAccess = 
      user.role === 'Manager/Admin' ||
      (user.role === 'Crew Chief' && shift.crewChief?.id === user.id) ||
      (user.role === 'Employee' && shift.assignedPersonnel.some(person => person.employee.id === user.id))

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      shift,
    })

  } catch (error) {
    console.error('Error getting shift by slug:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
