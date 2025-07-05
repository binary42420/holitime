import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/middleware";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";

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

    // Only managers can approve pending employees
    if (user.role !== "Manager/Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions. Only Manager/Admin users can approve employees." },
        { status: 403 }
      )
    }

    const { id: employeeId } = await params
    const { email, phone, certifications, location, notes } = await request.json()

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      )
    }

    // Verify the employee exists and is pending
    const employeeCheck = await query(`
      SELECT id, name, email FROM users 
      WHERE id = $1 AND status = 'pending_activation' AND requires_approval = true
    `, [employeeId])

    if (employeeCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Pending employee not found" },
        { status: 404 }
      )
    }

    const employee = employeeCheck.rows[0]

    // Check if email is already in use by another active user
    const emailCheck = await query(`
      SELECT id FROM users 
      WHERE email = $1 AND id != $2 AND status = 'active'
    `, [email.trim(), employeeId])

    if (emailCheck.rows.length > 0) {
      return NextResponse.json(
        { error: "Email address is already in use by another user" },
        { status: 409 }
      )
    }

    // Generate a temporary password (user will need to reset it)
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
    const hashedPassword = await bcrypt.hash(tempPassword, 10)

    // Parse certifications
    const certificationsArray = certifications 
      ? certifications.split(",").map((cert: string) => cert.trim()).filter(Boolean)
      : []

    // Update user account to active status
    await query(`
      UPDATE users SET 
        email = $1,
        password_hash = $2,
        status = 'active',
        requires_approval = false,
        approved_by = $3,
        approved_at = NOW(),
        approval_notes = $4,
        updated_at = NOW()
      WHERE id = $5
    `, [email.trim(), hashedPassword, user.id, notes || null, employeeId])

    // Update user profile information
    await query(
      `UPDATE users SET 
        phone = $1,
        location = $2,
        certifications = $3,
        updated_at = NOW()
      WHERE id = $4 ` , [phone || null, location || null, certificationsArray, employeeId])

    // Log the approval
    console.log(`Employee approved: ${employee.name} (${employeeId}) by ${user.name} (${user.id})`)

    // TODO: Send welcome email with login instructions and temporary password
    // This would be implemented with your email service

    return NextResponse.json({
      success: true,
      message: `Employee ${employee.name} has been approved and activated`,
      tempPassword: tempPassword // In production, this should be sent via email instead
    })

  } catch (error) {
    console.error("Error approving employee:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
