import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/middleware'
import { emailService } from '@/lib/email-service-enhanced'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only managers can test email
    if (user.role !== 'Manager/Admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { testEmail } = body

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Test email address is required' },
        { status: 400 }
      )
    }

    // Send test email
    const emailSent = await emailService.sendEmail({
      to: [{ email: testEmail, name: 'Test User' }],
      subject: 'Test Email - HoliTime Workforce Management',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #3b82f6; margin: 0;">HoliTime</h1>
            <p style="color: #6b7280; margin: 5px 0;">Workforce Management</p>
          </div>
          
          <h2 style="color: #1f2937; margin-bottom: 20px;">Email Service Test</h2>
          
          <p style="color: #374151; line-height: 1.6;">Hello,</p>
          
          <p style="color: #374151; line-height: 1.6;">
            This is a test email to verify that the HoliTime email service is working correctly.
          </p>
          
          <div style="background: #dcfce7; border: 1px solid #16a34a; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="color: #15803d; margin: 0; font-weight: 500;">
              ✅ Email Service Status: Working
            </p>
            <p style="color: #15803d; margin: 10px 0 0 0; font-size: 14px;">
              If you received this email, the SMTP configuration is correct and emails are being sent successfully.
            </p>
          </div>
          
          <p style="color: #374151; line-height: 1.6;">
            Test details:
          </p>
          <ul style="color: #374151; line-height: 1.6;">
            <li>Sent by: ${user.name} (${user.email})</li>
            <li>Timestamp: ${new Date().toISOString()}</li>
            <li>Service: Enhanced Email Service</li>
          </ul>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            HoliTime Workforce Management System<br>
            This is a test message.
          </p>
        </div>
      `,
      textBody: `
Email Service Test - HoliTime Workforce Management

Hello,

This is a test email to verify that the HoliTime email service is working correctly.

✅ Email Service Status: Working

If you received this email, the SMTP configuration is correct and emails are being sent successfully.

Test details:
- Sent by: ${user.name} (${user.email})
- Timestamp: ${new Date().toISOString()}
- Service: Enhanced Email Service

HoliTime Workforce Management System
This is a test message.
      `
    })

    if (!emailSent) {
      return NextResponse.json({
        error: 'Failed to send test email. Please check SMTP configuration.',
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent successfully to ${testEmail}`,
    })
  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
