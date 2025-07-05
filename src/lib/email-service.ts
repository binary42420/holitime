// Email service for workforce management platform
// This is a mock implementation - in production, integrate with services like:
// - SendGrid
// - AWS SES
// - Nodemailer with SMTP
// - Resend
// - Postmark

export interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
}

export interface EmailRecipient {
  email: string;
  name: string;
}

export interface EmailOptions {
  to: EmailRecipient[];
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  template: EmailTemplate;
  variables?: Record<string, string>;
}

class EmailService {
  private isProduction = process.env.NODE_ENV === "production"
  private fromEmail = process.env.FROM_EMAIL || "noreply@holitime.com"
  private fromName = process.env.FROM_NAME || "HoliTime Workforce Management"

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // In development, just log the email
      if (!this.isProduction) {
        console.log("📧 Email would be sent:", {
          from: `${this.fromName} <${this.fromEmail}>`,
          to: options.to.map(r => `${r.name} <${r.email}>`).join(", "),
          cc: options.cc?.map(r => `${r.name} <${r.email}>`).join(", "),
          subject: this.replaceVariables(options.template.subject, options.variables),
          body: this.replaceVariables(options.template.textBody, options.variables)
        })
        return true
      }

      // In production, implement actual email sending
      // Example with fetch to external email service:
      /*
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: { email: this.fromEmail, name: this.fromName },
          to: options.to,
          cc: options.cc,
          bcc: options.bcc,
          subject: this.replaceVariables(options.template.subject, options.variables),
          html: this.replaceVariables(options.template.htmlBody, options.variables),
          text: this.replaceVariables(options.template.textBody, options.variables)
        })
      });
      
      return response.ok;
      */
      
      return true // Mock success for now
    } catch (error) {
      console.error("Failed to send email:", error)
      return false
    }
  }

  private replaceVariables(template: string, variables?: Record<string, string>): string {
    if (!variables) return template
    
    let result = template
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, "g"), value)
    })
    return result
  }

  // Pre-defined email templates
  getPasswordResetTemplate(): EmailTemplate {
    return {
      subject: "Password Reset - HoliTime Workforce Management",
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hello {{userName}},</p>
          <p>A password reset has been requested for your HoliTime account.</p>
          <p>Your temporary password is: <strong>{{tempPassword}}</strong></p>
          <p>Please log in and change your password immediately for security.</p>
          <p>If you didn't request this reset, please contact your administrator.</p>
          <hr>
          <p><small>HoliTime Workforce Management System</small></p>
        </div>
      `,
      textBody: `
Password Reset Request

Hello {{userName}},

A password reset has been requested for your HoliTime account.

Your temporary password is: {{tempPassword}}

Please log in and change your password immediately for security.

If you didn't request this reset, please contact your administrator.

HoliTime Workforce Management System
      `
    }
  }

  getShiftAssignmentTemplate(): EmailTemplate {
    return {
      subject: "New Shift Assignment - {{shiftDate}} {{shiftTime}}",
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Shift Assignment</h2>
          <p>Hello {{workerName}},</p>
          <p>You have been assigned to a new shift:</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <strong>{{jobName}}</strong><br>
            Client: {{clientName}}<br>
            Date: {{shiftDate}}<br>
            Time: {{shiftTime}}<br>
            Location: {{location}}<br>
            Role: {{role}}
          </div>
          <p>Please confirm your availability and arrive on time.</p>
          <p>If you have any questions, contact your crew chief or manager.</p>
          <hr>
          <p><small>HoliTime Workforce Management System</small></p>
        </div>
      `,
      textBody: `
New Shift Assignment

Hello {{workerName}},

You have been assigned to a new shift:

{{jobName}}
Client: {{clientName}}
Date: {{shiftDate}}
Time: {{shiftTime}}
Location: {{location}}
Role: {{role}}

Please confirm your availability and arrive on time.

If you have any questions, contact your crew chief or manager.

HoliTime Workforce Management System
      `
    }
  }

  getShiftReminderTemplate(): EmailTemplate {
    return {
      subject: "Shift Reminder - Tomorrow {{shiftTime}}",
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Shift Reminder</h2>
          <p>Hello {{workerName}},</p>
          <p>This is a reminder about your shift tomorrow:</p>
          <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <strong>{{jobName}}</strong><br>
            Client: {{clientName}}<br>
            Date: {{shiftDate}}<br>
            Time: {{shiftTime}}<br>
            Location: {{location}}<br>
            Role: {{role}}
          </div>
          <p>Please arrive 15 minutes early and bring any required equipment.</p>
          <p>Contact information: {{contactInfo}}</p>
          <hr>
          <p><small>HoliTime Workforce Management System</small></p>
        </div>
      `,
      textBody: `
Shift Reminder

Hello {{workerName}},

This is a reminder about your shift tomorrow:

{{jobName}}
Client: {{clientName}}
Date: {{shiftDate}}
Time: {{shiftTime}}
Location: {{location}}
Role: {{role}}

Please arrive 15 minutes early and bring any required equipment.

Contact information: {{contactInfo}}

HoliTime Workforce Management System
      `
    }
  }

  getShiftConfirmationTemplate(): EmailTemplate {
    return {
      subject: "Shift Confirmation Required - {{shiftDate}}",
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Shift Confirmation Required</h2>
          <p>Hello {{workerName}},</p>
          <p>Please confirm your availability for the following shift:</p>
          <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <strong>{{jobName}}</strong><br>
            Client: {{clientName}}<br>
            Date: {{shiftDate}}<br>
            Time: {{shiftTime}}<br>
            Location: {{location}}<br>
            Role: {{role}}
          </div>
          <p>Please respond as soon as possible to confirm your availability.</p>
          <p>Contact your manager if you cannot attend this shift.</p>
          <hr>
          <p><small>HoliTime Workforce Management System</small></p>
        </div>
      `,
      textBody: `
Shift Confirmation Required

Hello {{workerName}},

Please confirm your availability for the following shift:

{{jobName}}
Client: {{clientName}}
Date: {{shiftDate}}
Time: {{shiftTime}}
Location: {{location}}
Role: {{role}}

Please respond as soon as possible to confirm your availability.

Contact your manager if you cannot attend this shift.

HoliTime Workforce Management System
      `
    }
  }

  // Document-related email templates
  getDocumentAssignmentTemplate(): EmailTemplate {
    return {
      subject: "New Document Assignment - {{documentName}}",
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Document Assignment</h2>
          <p>Hello {{userName}},</p>
          <p>You have been assigned a new document to complete:</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <strong>{{documentName}}</strong><br>
            Due Date: {{dueDate}}<br>
            Priority: {{priority}}
          </div>
          <p>Please log in to your account to complete this document as soon as possible.</p>
          <p>If you have any questions, please contact your supervisor.</p>
          <hr>
          <p><small>HoliTime Workforce Management System</small></p>
        </div>
      `,
      textBody: `
New Document Assignment

Hello {{userName}},

You have been assigned a new document to complete:

{{documentName}}
Due Date: {{dueDate}}
Priority: {{priority}}

Please log in to your account to complete this document as soon as possible.

If you have any questions, please contact your supervisor.

HoliTime Workforce Management System
      `
    }
  }

  getDocumentReminderTemplate(): EmailTemplate {
    return {
      subject: "Document Reminder - {{documentName}} Due Soon",
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Document Reminder</h2>
          <p>Hello {{userName}},</p>
          <p>This is a reminder that the following document is due soon:</p>
          <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <strong>{{documentName}}</strong><br>
            Due Date: {{dueDate}}
          </div>
          <p>Please complete it as soon as possible to avoid any delays.</p>
          <p>Log in to your account to access and complete the document.</p>
          <hr>
          <p><small>HoliTime Workforce Management System</small></p>
        </div>
      `,
      textBody: `
Document Reminder

Hello {{userName}},

This is a reminder that the following document is due soon:

{{documentName}}
Due Date: {{dueDate}}

Please complete it as soon as possible to avoid any delays.

Log in to your account to access and complete the document.

HoliTime Workforce Management System
      `
    }
  }

  getDocumentApprovedTemplate(): EmailTemplate {
    return {
      subject: "Document Approved - {{documentName}}",
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Document Approved</h2>
          <p>Hello {{userName}},</p>
          <p>Your document has been approved:</p>
          <div style="background: #d1edff; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <strong>{{documentName}}</strong><br>
            Approved by: {{reviewerName}}<br>
            Approved on: {{approvalDate}}
          </div>
          {{#comments}}
          <p><strong>Comments:</strong> {{comments}}</p>
          {{/comments}}
          <p>Thank you for completing your required documentation.</p>
          <hr>
          <p><small>HoliTime Workforce Management System</small></p>
        </div>
      `,
      textBody: `
Document Approved

Hello {{userName}},

Your document has been approved:

{{documentName}}
Approved by: {{reviewerName}}
Approved on: {{approvalDate}}

Comments: {{comments}}

Thank you for completing your required documentation.

HoliTime Workforce Management System
      `
    }
  }

  getDocumentRejectedTemplate(): EmailTemplate {
    return {
      subject: "Document Requires Revision - {{documentName}}",
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Document Requires Revision</h2>
          <p>Hello {{userName}},</p>
          <p>Your document submission requires revision:</p>
          <div style="background: #fee2e2; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <strong>{{documentName}}</strong><br>
            Reviewed by: {{reviewerName}}<br>
            Reviewed on: {{reviewDate}}
          </div>
          <p><strong>Comments:</strong> {{comments}}</p>
          <p>Please make the necessary changes and resubmit the document.</p>
          <p>Log in to your account to access and revise the document.</p>
          <hr>
          <p><small>HoliTime Workforce Management System</small></p>
        </div>
      `,
      textBody: `
Document Requires Revision

Hello {{userName}},

Your document submission requires revision:

{{documentName}}
Reviewed by: {{reviewerName}}
Reviewed on: {{reviewDate}}

Comments: {{comments}}

Please make the necessary changes and resubmit the document.

Log in to your account to access and revise the document.

HoliTime Workforce Management System
      `
    }
  }
}

export const emailService = new EmailService()
