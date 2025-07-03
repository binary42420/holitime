import { query } from './db'
import { emailService } from './email-service-enhanced'
import { v4 as uuidv4 } from 'uuid'

export interface Notification {
  id: number
  user_id: string
  type: NotificationType
  title: string
  message: string
  data?: any
  is_read: boolean
  is_email_sent: boolean
  email_sent_at?: Date
  action_url?: string
  action_text?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  expires_at?: Date
  created_at: Date
  updated_at: Date
}

export type NotificationType = 
  | 'shift_assignment'
  | 'shift_reminder'
  | 'shift_cancelled'
  | 'shift_updated'
  | 'document_reminder'
  | 'document_approved'
  | 'document_rejected'
  | 'system_message'
  | 'welcome'
  | 'profile_update'

export interface CreateNotificationRequest {
  user_id: string
  type: NotificationType
  title: string
  message: string
  data?: any
  action_url?: string
  action_text?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  expires_at?: Date
  send_email?: boolean
}

export interface ShiftAssignmentData {
  shift_id: number
  assigned_by: string
  assignment_type?: 'direct' | 'invitation' | 'replacement'
  response_deadline?: Date
  auto_accept_after?: Date
  requires_confirmation?: boolean
}

export interface NotificationResponse {
  notification_id: number
  user_id: string
  response_type: 'accept' | 'decline' | 'maybe' | 'acknowledged'
  response_data?: any
  response_message?: string
  ip_address?: string
  user_agent?: string
}

class NotificationService {
  async createNotification(request: CreateNotificationRequest): Promise<Notification | null> {
    try {
      const insertQuery = `
        INSERT INTO notifications (
          user_id, type, title, message, data, action_url, action_text, priority, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `

      const result = await query(insertQuery, [
        request.user_id,
        request.type,
        request.title,
        request.message,
        JSON.stringify(request.data || {}),
        request.action_url,
        request.action_text,
        request.priority || 'normal',
        request.expires_at
      ])

      const notification: Notification = result.rows[0]

      // Send email if requested and user has email notifications enabled
      if (request.send_email) {
        await this.sendNotificationEmail(notification)
      }

      return notification
    } catch (error) {
      console.error('Error creating notification:', error)
      return null
    }
  }

  async createShiftAssignmentNotification(
    userId: string,
    shiftData: ShiftAssignmentData,
    shiftDetails: any
  ): Promise<{ notification: Notification | null, confirmationToken: string | null }> {
    try {
      // Generate confirmation token
      const confirmationToken = uuidv4()

      // Create notification
      const notification = await this.createNotification({
        user_id: userId,
        type: 'shift_assignment',
        title: `New Shift Assignment - ${shiftDetails.jobName}`,
        message: `You have been assigned to work ${shiftDetails.role} at ${shiftDetails.clientName} on ${new Date(shiftDetails.date).toLocaleDateString()}.`,
        data: {
          shift_id: shiftData.shift_id,
          shift_details: shiftDetails,
          confirmation_token: confirmationToken
        },
        action_url: `/notifications/shift-confirm/${confirmationToken}`,
        action_text: 'Confirm Availability',
        priority: 'high',
        expires_at: shiftData.response_deadline,
        send_email: false // We'll send custom email below
      })

      if (!notification) {
        return { notification: null, confirmationToken: null }
      }

      // Create shift assignment notification record
      const shiftNotificationQuery = `
        INSERT INTO shift_assignment_notifications (
          notification_id, shift_id, assigned_by, assignment_type,
          response_deadline, auto_accept_after, requires_confirmation, confirmation_token
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `

      await query(shiftNotificationQuery, [
        notification.id,
        shiftData.shift_id,
        shiftData.assigned_by,
        shiftData.assignment_type || 'direct',
        shiftData.response_deadline,
        shiftData.auto_accept_after,
        shiftData.requires_confirmation !== false,
        confirmationToken
      ])

      // Get user details for email
      const userQuery = 'SELECT name, email FROM users WHERE id = $1'
      const userResult = await query(userQuery, [userId])
      
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0]
        
        // Send custom shift assignment email
        await emailService.sendShiftAssignmentEmail(
          user.email,
          user.name,
          shiftDetails,
          confirmationToken
        )

        // Mark email as sent
        await query(
          'UPDATE notifications SET is_email_sent = true, email_sent_at = CURRENT_TIMESTAMP WHERE id = $1',
          [notification.id]
        )
      }

      return { notification, confirmationToken }
    } catch (error) {
      console.error('Error creating shift assignment notification:', error)
      return { notification: null, confirmationToken: null }
    }
  }

  async respondToNotification(
    notificationId: number,
    userId: string,
    responseType: 'accept' | 'decline' | 'maybe' | 'acknowledged',
    responseMessage?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    try {
      // Insert response
      const responseQuery = `
        INSERT INTO notification_responses (
          notification_id, user_id, response_type, response_message, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `

      await query(responseQuery, [
        notificationId,
        userId,
        responseType,
        responseMessage,
        ipAddress,
        userAgent
      ])

      // Mark notification as read
      await query(
        'UPDATE notifications SET is_read = true WHERE id = $1',
        [notificationId]
      )

      // Handle shift assignment responses
      const notification = await this.getNotification(notificationId)
      if (notification && notification.type === 'shift_assignment') {
        await this.handleShiftAssignmentResponse(notification, responseType, userId)
      }

      return true
    } catch (error) {
      console.error('Error responding to notification:', error)
      return false
    }
  }

  private async handleShiftAssignmentResponse(
    notification: Notification,
    responseType: string,
    userId: string
  ): Promise<void> {
    try {
      const shiftId = notification.data?.shift_id
      if (!shiftId) return

      // Update shift assignment status based on response
      let shiftStatus = 'pending'
      if (responseType === 'accept') {
        shiftStatus = 'confirmed'
      } else if (responseType === 'decline') {
        shiftStatus = 'declined'
      }

      // Update shift assignment (assuming you have a shift_assignments table)
      await query(
        'UPDATE shift_assignments SET status = $1 WHERE shift_id = $2 AND user_id = $3',
        [shiftStatus, shiftId, userId]
      )

      // Notify admin/manager about the response
      const adminQuery = `
        SELECT id FROM users 
        WHERE role IN ('Manager/Admin', 'Crew Chief') 
        AND id != $1
      `
      const adminResult = await query(adminQuery, [userId])

      for (const admin of adminResult.rows) {
        await this.createNotification({
          user_id: admin.id,
          type: 'system_message',
          title: `Shift Response Received`,
          message: `${notification.data?.shift_details?.workerName || 'Worker'} has ${responseType}ed the shift assignment for ${notification.data?.shift_details?.jobName}.`,
          data: {
            original_notification_id: notification.id,
            shift_id: shiftId,
            response_type: responseType
          },
          priority: responseType === 'decline' ? 'high' : 'normal'
        })
      }
    } catch (error) {
      console.error('Error handling shift assignment response:', error)
    }
  }

  async getNotification(id: number): Promise<Notification | null> {
    try {
      const result = await query('SELECT * FROM notifications WHERE id = $1', [id])
      return result.rows.length > 0 ? result.rows[0] : null
    } catch (error) {
      console.error('Error fetching notification:', error)
      return null
    }
  }

  async getUserNotifications(
    userId: string,
    options: {
      unread_only?: boolean
      type?: NotificationType
      limit?: number
      offset?: number
    } = {}
  ): Promise<{ notifications: Notification[], total: number }> {
    try {
      let whereConditions = ['user_id = $1']
      let queryParams: any[] = [userId]
      let paramIndex = 2

      if (options.unread_only) {
        whereConditions.push('is_read = false')
      }

      if (options.type) {
        whereConditions.push(`type = $${paramIndex}`)
        queryParams.push(options.type)
        paramIndex++
      }

      // Add expiration check
      whereConditions.push('(expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)')

      const whereClause = whereConditions.join(' AND ')

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM notifications WHERE ${whereClause}`
      const countResult = await query(countQuery, queryParams)
      const total = parseInt(countResult.rows[0].total)

      // Get notifications
      const limit = options.limit || 50
      const offset = options.offset || 0

      const notificationsQuery = `
        SELECT * FROM notifications 
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `
      queryParams.push(limit, offset)

      const result = await query(notificationsQuery, queryParams)
      const notifications: Notification[] = result.rows

      return { notifications, total }
    } catch (error) {
      console.error('Error fetching user notifications:', error)
      return { notifications: [], total: 0 }
    }
  }

  async markAsRead(notificationId: number, userId: string): Promise<boolean> {
    try {
      await query(
        'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
        [notificationId, userId]
      )
      return true
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return false
    }
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      await query(
        'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
        [userId]
      )
      return true
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      return false
    }
  }

  async deleteNotification(notificationId: number, userId: string): Promise<boolean> {
    try {
      await query(
        'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
        [notificationId, userId]
      )
      return true
    } catch (error) {
      console.error('Error deleting notification:', error)
      return false
    }
  }

  private async sendNotificationEmail(notification: Notification): Promise<void> {
    try {
      // Get user details
      const userQuery = 'SELECT name, email FROM users WHERE id = $1'
      const userResult = await query(userQuery, [notification.user_id])
      
      if (userResult.rows.length === 0) return

      const user = userResult.rows[0]

      // Check if user has email notifications enabled
      const prefsQuery = 'SELECT email_notifications FROM notification_preferences WHERE user_id = $1'
      const prefsResult = await query(prefsQuery, [notification.user_id])
      
      if (prefsResult.rows.length > 0 && !prefsResult.rows[0].email_notifications) {
        return // User has disabled email notifications
      }

      // Send email
      const success = await emailService.sendEmail({
        to: [{ email: user.email, name: user.name }],
        subject: notification.title,
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${notification.title}</h2>
            <p>Hello ${user.name},</p>
            <p>${notification.message}</p>
            ${notification.action_url ? `
              <div style="text-align: center; margin: 20px 0;">
                <a href="${process.env.NEXTAUTH_URL}${notification.action_url}" 
                   style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                  ${notification.action_text || 'View Details'}
                </a>
              </div>
            ` : ''}
            <hr>
            <p><small>HoliTime Workforce Management System</small></p>
          </div>
        `,
        textBody: `${notification.title}\n\nHello ${user.name},\n\n${notification.message}\n\n${notification.action_url ? `View details: ${process.env.NEXTAUTH_URL}${notification.action_url}\n\n` : ''}HoliTime Workforce Management System`
      })

      if (success) {
        await query(
          'UPDATE notifications SET is_email_sent = true, email_sent_at = CURRENT_TIMESTAMP WHERE id = $1',
          [notification.id]
        )
      }
    } catch (error) {
      console.error('Error sending notification email:', error)
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const result = await query(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)',
        [userId]
      )
      return parseInt(result.rows[0].count)
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  }
}

export const notificationService = new NotificationService()
