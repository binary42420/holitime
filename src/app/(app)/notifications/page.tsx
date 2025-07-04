'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Bell,
  CheckCircle,
  Clock,
  AlertTriangle,
  Mail,
  Calendar,
  FileText,
  Users,
  Settings,
  Trash2,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import { Notification } from '@/lib/notification-service'
import { useToast } from '@/hooks/use-toast'

export default function NotificationsPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    fetchNotifications()
    fetchUnreadCount()
  }, [activeTab])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (activeTab === 'unread') {
        params.append('unread_only', 'true')
      } else if (activeTab !== 'all') {
        params.append('type', activeTab)
      }

      const response = await fetch(`/api/notifications?${params}`)
      if (!response.ok) throw new Error('Failed to fetch notifications')
      
      const data = await response.json()
      setNotifications(data.notifications || [])
    } catch (error) {
      console.error('Error fetching notifications:', error)
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications/unread-count')
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.count || 0)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Failed to mark as read')

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      )
      
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive'
      })
    }
  }

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Failed to mark all as read')

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      )
      
      setUnreadCount(0)
      
      toast({
        title: 'Success',
        description: 'All notifications marked as read'
      })
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive'
      })
    }
  }

  const deleteNotification = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete notification')

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      
      toast({
        title: 'Success',
        description: 'Notification deleted'
      })
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        variant: 'destructive'
      })
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'shift_assignment':
      case 'shift_reminder':
      case 'shift_cancelled':
      case 'shift_updated':
        return <Calendar className="h-5 w-5 text-blue-500" />
      case 'document_reminder':
      case 'document_approved':
      case 'document_rejected':
        return <FileText className="h-5 w-5 text-green-500" />
      case 'system_message':
        return <Settings className="h-5 w-5 text-gray-500" />
      case 'welcome':
        return <Users className="h-5 w-5 text-purple-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'normal':
        return 'bg-blue-100 text-blue-800'
      case 'low':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true
    if (activeTab === 'unread') return !notification.is_read
    return notification.type === activeTab
  })

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile-First Header */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-headline">Notifications 🔔</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Stay updated with assignments
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
            {unreadCount > 0 && (
              <Button size="mobile" variant="outline" onClick={markAllAsRead}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark All Read ({unreadCount})
              </Button>
            )}
            <Badge variant="secondary" className="text-center py-2">
              {unreadCount} unread
            </Badge>
          </div>
        </div>
      </div>

      {/* Mobile-First Notification Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-1 h-auto p-1">
          <TabsTrigger value="all">
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="shift_assignment">
            Shifts
          </TabsTrigger>
          <TabsTrigger value="document_reminder">
            Documents
          </TabsTrigger>
          <TabsTrigger value="system_message">
            System
          </TabsTrigger>
          <TabsTrigger value="welcome">
            Welcome
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === 'all' && 'All Notifications'}
                {activeTab === 'unread' && 'Unread Notifications'}
                {activeTab === 'shift_assignment' && 'Shift Notifications'}
                {activeTab === 'document_reminder' && 'Document Notifications'}
                {activeTab === 'system_message' && 'System Messages'}
                {activeTab === 'welcome' && 'Welcome Messages'}
              </CardTitle>
              <CardDescription>
                {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading notifications...</p>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {activeTab === 'unread' ? 'No unread notifications' : 'No notifications found'}
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((notification) => (
                    <Card
                      key={notification.id}
                      className={`card-mobile transition-all hover:shadow-md ${
                        !notification.is_read ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''
                      }`}
                    >
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          {/* Mobile-First Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              {getNotificationIcon(notification.type)}
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-base">{notification.title}</h3>
                                  <div className="flex items-center gap-2">
                                    <Badge className={getPriorityColor(notification.priority)} variant="secondary">
                                      {notification.priority}
                                    </Badge>
                                    {!notification.is_read && (
                                      <Badge variant="default" className="text-xs">New</Badge>
                                    )}
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">
                                  {notification.message}
                                </p>
                                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatTimeAgo(new Date(notification.created_at).toISOString())}
                                  </span>
                                  {notification.is_email_sent && (
                                    <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    Email sent
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            {notification.action_url && (
                              <Link href={notification.action_url}>
                                <Button variant="outline" size="sm">
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  {notification.action_text || 'View'}
                                </Button>
                              </Link>
                            )}
                            
                            {!notification.is_read && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => deleteNotification(notification.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
