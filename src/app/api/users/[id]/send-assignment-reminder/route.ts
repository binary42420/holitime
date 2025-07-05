import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/middleware"
import { query } from "@/lib/db"
import { emailService } from "@/lib/email-service"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Only managers and crew chiefs can send assignment reminders
    if (user.role !== "Manager/Admin" && user.role !== "Crew Chief") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const { id: userId } = await params

    // Get user details
    const userResult = await query(`
      SELECT id, name, email, role
      FROM users 
      WHERE id = $1
    `, [userId])

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const targetUser = userResult.rows[0]

    // Get upcoming shifts for this user
    const shiftsResult = await query(`
      SELECT 
        s.id,
        s.date,
        s.start_time,
        s.end_time,
        s.location,
        j.name as job_name,
        c.company_name as client_name,
        sa.role_on_shift
      FROM shift_assignments sa
      JOIN shifts s ON sa.shift_id = s.id
      JOIN jobs j ON s.job_id = j.id
      JOIN clients c ON j.client_id = c.id
      WHERE sa.user_id = $1 
      AND s.date >= CURRENT_DATE
      AND sa.status NOT IN ('Cancelled', 'No Show')
      ORDER BY s.date, s.start_time
      LIMIT 5
    `, [userId])

    if (shiftsResult.rows.length === 0) {
      return NextResponse.json(
        { error: "No upcoming shifts found for this user" },
        { status: 400 }
      )
    }

    // Send reminder for each upcoming shift
    let emailsSent = 0
    const template = emailService.getShiftReminderTemplate()

    for (const shift of shiftsResult.rows) {
      const variables = {
        workerName: targetUser.name,
        jobName: shift.job_name,
        clientName: shift.client_name,
        shiftDate: new Date(shift.date).toLocaleDateString(),
        shiftTime: `${shift.start_time} - ${shift.end_time}`,
        location: shift.location,
        role: shift.role_on_shift,
        contactInfo: user.email // Contact info of the person sending the reminder
      }

      const emailSent = await emailService.sendEmail({
        to: [{ email: targetUser.email, name: targetUser.name }],
        template,
        variables
      })

      if (emailSent) {
        emailsSent++
      }
    }

    // Log the action
    console.log(`User ${user.email} sent assignment reminders to ${targetUser.name} for ${emailsSent} shifts`)

    return NextResponse.json({
      success: true,
      message: `Assignment reminders sent for ${emailsSent} upcoming shifts`,
      emailsSent,
      totalShifts: shiftsResult.rows.length,
      recipient: {
        name: targetUser.name,
        email: targetUser.email
      }
    })
  } catch (error) {
    console.error("Error sending assignment reminder:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
