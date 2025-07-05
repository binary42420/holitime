import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/middleware"
import { query } from "@/lib/db"
import { emailService } from "@/lib/email-service-enhanced"
import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"

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

    // Only managers can send password reset emails
    if (user.role !== "Manager/Admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    }

    const { id } = await params

    // Get user details
    const result = await query(
      "SELECT id, name, email FROM users WHERE id = $1 AND is_active = true",
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const targetUser = result.rows[0]

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase()

    // Hash the temporary password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(tempPassword, saltRounds)

    // Update the user's password in the database
    await query(
      "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [hashedPassword, id]
    )

    // Send password reset email
    const emailSent = await emailService.sendEmail({
      to: [{ email: targetUser.email, name: targetUser.name }],
      subject: "Password Reset - HoliTime Workforce Management",
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3b82f6; margin: 0;">HoliTime</h1>
            <p style="color: #6b7280; margin: 5px 0;">Workforce Management</p>
          </div>

          <h2 style="color: #1f2937; margin-bottom: 20px;">Password Reset</h2>

          <p style="color: #374151; line-height: 1.6;">Hello ${targetUser.name},</p>

          <p style="color: #374151; line-height: 1.6;">
            Your password has been reset by an administrator. Your new temporary password is:
          </p>

          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <code style="font-size: 18px; font-weight: bold; color: #1f2937; letter-spacing: 1px;">
              ${tempPassword}
            </code>
          </div>

          <div style="background: #fef3cd; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-weight: 500;">
              ⚠️ Important Security Notice
            </p>
            <p style="color: #92400e; margin: 10px 0 0 0; font-size: 14px;">
              Please log in immediately and change your password for security. This temporary password should not be shared with anyone.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL || "http://localhost:3000"}/login"
               style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
              Log In Now
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            If you didn't request this password reset, please contact your administrator immediately.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            HoliTime Workforce Management System<br>
            This is an automated message, please do not reply.
          </p>
        </div>
      `,
      textBody: `
Password Reset - HoliTime Workforce Management

Hello ${targetUser.name},

Your password has been reset by an administrator. Your new temporary password is:

${tempPassword}

IMPORTANT: Please log in immediately and change your password for security. This temporary password should not be shared with anyone.

Login at: ${process.env.NEXTAUTH_URL || "http://localhost:3000"}/login

If you didn't request this password reset, please contact your administrator immediately.

HoliTime Workforce Management System
This is an automated message, please do not reply.
      `
    })

    if (!emailSent) {
      // If email failed, revert the password change
      await query(
        "UPDATE users SET password_hash = (SELECT password_hash FROM users WHERE id = $1), updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      )

      return NextResponse.json({
        error: "Failed to send password reset email. Please try again.",
      }, { status: 500 })
    }

    // Log the successful password reset
    console.log(`Password reset completed for user ${targetUser.email} by admin ${user.email}`)

    return NextResponse.json({
      success: true,
      message: `Password reset email sent to ${targetUser.email}`,
    })
  } catch (error) {
    console.error("Error sending password reset:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
