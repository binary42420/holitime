import nodemailer from 'nodemailer'
import { query } from './db'

export interface EmailRecipient {
  email: string
  name?: string
}

export interface EmailTemplate {
  id?: number
  name: string
  subject: string
  htmlBody: string
  textBody?: string
  templateType: string
  variables?: Record<string, string>
}

export interface SendEmailRequest {
  to: EmailRecipient[]
  cc?: EmailRecipient[]
  bcc?: EmailRecipient[]
  subject?: string
  htmlBody?: string
  textBody?: string
  template?: EmailTemplate
  variables?: Record<string, any>
  priority?: number
  scheduledFor?: Date
}

export interface EmailQueueItem {
  id: number
  to_email: string
  to_name?: string
  subject: string
  html_body?: string
  text_body?: string
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled'
  attempts: number
  max_attempts: number
  scheduled_for: Date
  error_message?: string
}

class EnhancedEmailService {
  private transporter: nodemailer.Transporter
  private isConfigured: boolean = false

  constructor() {
    this.initializeTransporter()
  }

  private initializeTransporter() {
    try {
      const smtpConfig = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false // For development - should be true in production
        }
      }

      if (!smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
        console.warn('SMTP configuration incomplete. Email service will be disabled.')
        return
      }

      this.transporter = nodemailer.createTransporter(smtpConfig)
      this.isConfigured = true

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('SMTP connection failed:', error)
          this.isConfigured = false
        } else {
          console.log('✅ SMTP server is ready to send emails')
        }
      })
    } catch (error) {
      console.error('Failed to initialize email transporter:', error)
      this.isConfigured = false
    }
  }

  async sendEmail(request: SendEmailRequest): Promise<boolean> {
    if (!this.isConfigured) {
      console.warn('Email service not configured. Skipping email send.')
      return false
    }

    try {
      // If using template, process it
      let subject = request.subject
      let htmlBody = request.htmlBody
      let textBody = request.textBody

      if (request.template) {
        const processed = this.processTemplate(request.template, request.variables || {})
        subject = processed.subject
        htmlBody = processed.htmlBody
        textBody = processed.textBody
      }

      // Send to each recipient
      const results = await Promise.allSettled(
        request.to.map(async (recipient) => {
          const mailOptions = {
            from: {
              name: 'HoliTime Workforce Management',
              address: process.env.SMTP_USER!
            },
            to: {
              name: recipient.name || recipient.email,
              address: recipient.email
            },
            cc: request.cc?.map(cc => ({ name: cc.name || cc.email, address: cc.email })),
            bcc: request.bcc?.map(bcc => ({ name: bcc.name || bcc.email, address: bcc.email })),
            subject: subject!,
            html: htmlBody,
            text: textBody,
            headers: {
              'X-Mailer': 'HoliTime Workforce Management System',
              'X-Priority': this.getPriorityHeader(request.priority || 5)
            }
          }

          return await this.transporter.sendMail(mailOptions)
        })
      )

      // Check if all emails were sent successfully
      const failures = results.filter(result => result.status === 'rejected')
      if (failures.length > 0) {
        console.error('Some emails failed to send:', failures)
        return false
      }

      return true
    } catch (error) {
      console.error('Error sending email:', error)
      return false
    }
  }

  async queueEmail(request: SendEmailRequest): Promise<number | null> {
    try {
      // Process template if provided
      let subject = request.subject
      let htmlBody = request.htmlBody
      let textBody = request.textBody
      let templateId = null

      if (request.template) {
        const processed = this.processTemplate(request.template, request.variables || {})
        subject = processed.subject
        htmlBody = processed.htmlBody
        textBody = processed.textBody
        templateId = request.template.id
      }

      // Queue email for each recipient
      const queueIds: number[] = []

      for (const recipient of request.to) {
        const insertQuery = `
          INSERT INTO email_queue (
            to_email, to_name, subject, html_body, text_body,
            template_id, template_variables, priority, scheduled_for
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
        `

        const result = await query(insertQuery, [
          recipient.email,
          recipient.name,
          subject,
          htmlBody,
          textBody,
          templateId,
          JSON.stringify(request.variables || {}),
          request.priority || 5,
          request.scheduledFor || new Date()
        ])

        queueIds.push(result.rows[0].id)
      }

      return queueIds[0] // Return first queue ID
    } catch (error) {
      console.error('Error queueing email:', error)
      return null
    }
  }

  async processEmailQueue(): Promise<void> {
    if (!this.isConfigured) {
      return
    }

    try {
      // Get pending emails that are ready to send
      const pendingQuery = `
        SELECT * FROM email_queue 
        WHERE status = 'pending' 
        AND scheduled_for <= CURRENT_TIMESTAMP
        AND attempts < max_attempts
        ORDER BY priority ASC, scheduled_for ASC
        LIMIT 10
      `

      const result = await query(pendingQuery)
      const emails: EmailQueueItem[] = result.rows

      for (const email of emails) {
        await this.processSingleQueuedEmail(email)
      }
    } catch (error) {
      console.error('Error processing email queue:', error)
    }
  }

  private async processSingleQueuedEmail(email: EmailQueueItem): Promise<void> {
    try {
      // Update status to sending
      await query(
        'UPDATE email_queue SET status = $1, attempts = attempts + 1 WHERE id = $2',
        ['sending', email.id]
      )

      const mailOptions = {
        from: {
          name: 'HoliTime Workforce Management',
          address: process.env.SMTP_USER!
        },
        to: {
          name: email.to_name || email.to_email,
          address: email.to_email
        },
        subject: email.subject,
        html: email.html_body,
        text: email.text_body
      }

      await this.transporter.sendMail(mailOptions)

      // Mark as sent
      await query(
        'UPDATE email_queue SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['sent', email.id]
      )

    } catch (error) {
      console.error(`Error sending queued email ${email.id}:`, error)

      // Mark as failed if max attempts reached
      const newStatus = email.attempts >= email.max_attempts ? 'failed' : 'pending'
      await query(
        'UPDATE email_queue SET status = $1, error_message = $2 WHERE id = $3',
        [newStatus, error.message, email.id]
      )
    }
  }

  private processTemplate(template: EmailTemplate, variables: Record<string, any>): {
    subject: string
    htmlBody: string
    textBody?: string
  } {
    const processString = (str: string): string => {
      return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] || match
      })
    }

    return {
      subject: processString(template.subject),
      htmlBody: processString(template.htmlBody),
      textBody: template.textBody ? processString(template.textBody) : undefined
    }
  }

  private getPriorityHeader(priority: number): string {
    if (priority <= 2) return '1 (Highest)'
    if (priority <= 4) return '2 (High)'
    if (priority <= 6) return '3 (Normal)'
    if (priority <= 8) return '4 (Low)'
    return '5 (Lowest)'
  }

  // Template management methods
  async getTemplate(name: string): Promise<EmailTemplate | null> {
    try {
      const result = await query(
        'SELECT * FROM email_templates_enhanced WHERE name = $1 AND is_active = true',
        [name]
      )

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]
      return {
        id: row.id,
        name: row.name,
        subject: row.subject,
        htmlBody: row.html_body,
        textBody: row.text_body,
        templateType: row.template_type,
        variables: row.variables
      }
    } catch (error) {
      console.error('Error fetching email template:', error)
      return null
    }
  }

  async createTemplate(template: Omit<EmailTemplate, 'id'>): Promise<EmailTemplate | null> {
    try {
      const insertQuery = `
        INSERT INTO email_templates_enhanced (
          name, subject, html_body, text_body, template_type, variables
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `

      const result = await query(insertQuery, [
        template.name,
        template.subject,
        template.htmlBody,
        template.textBody,
        template.templateType,
        JSON.stringify(template.variables || {})
      ])

      const row = result.rows[0]
      return {
        id: row.id,
        name: row.name,
        subject: row.subject,
        htmlBody: row.html_body,
        textBody: row.text_body,
        templateType: row.template_type,
        variables: row.variables
      }
    } catch (error) {
      console.error('Error creating email template:', error)
      return null
    }
  }

  // Convenience methods for common email types
  async sendShiftAssignmentEmail(workerEmail: string, workerName: string, shiftData: any, confirmationToken: string): Promise<boolean> {
    const template = await this.getTemplate('shift_assignment')
    if (!template) {
      console.error('Shift assignment email template not found')
      return false
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const variables = {
      workerName,
      jobName: shiftData.jobName,
      clientName: shiftData.clientName,
      shiftDate: new Date(shiftData.date).toLocaleDateString(),
      shiftTime: `${shiftData.startTime} - ${shiftData.endTime}`,
      location: shiftData.location,
      role: shiftData.role,
      acceptUrl: `${baseUrl}/api/notifications/shift-response?token=${confirmationToken}&response=accept`,
      declineUrl: `${baseUrl}/api/notifications/shift-response?token=${confirmationToken}&response=decline`,
      confirmUrl: `${baseUrl}/notifications/shift-confirm/${confirmationToken}`,
      responseDeadline: shiftData.responseDeadline ? new Date(shiftData.responseDeadline).toLocaleDateString() : 'ASAP'
    }

    return await this.sendEmail({
      to: [{ email: workerEmail, name: workerName }],
      template,
      variables
    })
  }

  async sendShiftReminderEmail(workerEmail: string, workerName: string, shiftData: any): Promise<boolean> {
    const template = await this.getTemplate('shift_reminder')
    if (!template) {
      console.error('Shift reminder email template not found')
      return false
    }

    const variables = {
      workerName,
      jobName: shiftData.jobName,
      clientName: shiftData.clientName,
      shiftDate: new Date(shiftData.date).toLocaleDateString(),
      shiftTime: `${shiftData.startTime} - ${shiftData.endTime}`,
      location: shiftData.location,
      role: shiftData.role
    }

    return await this.sendEmail({
      to: [{ email: workerEmail, name: workerName }],
      template,
      variables
    })
  }
}

// Export singleton instance
export const emailService = new EnhancedEmailService()

// Start email queue processor (runs every 30 seconds)
// Note: This should be started separately in production
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  setInterval(() => {
    emailService.processEmailQueue()
  }, 30000)
}
