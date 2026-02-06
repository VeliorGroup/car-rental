'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  PiBell, 
  PiCheckCircle, 
  PiWarning, 
  PiCalendar, 
  PiCarProfile, 
  PiCreditCard,
  PiClock,
  PiCheck,
  PiTrash
} from 'react-icons/pi'
import { formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Loader } from '@/components/ui/loader'
import api from '@/lib/api'

interface Notification {
  id: string
  type: 'BOOKING' | 'CAUTION' | 'DAMAGE' | 'MAINTENANCE' | 'EXPIRY' | 'SYSTEM'
  title: string
  message: string
  read: boolean
  createdAt: string
  actionUrl?: string
}

export default function NotificationsPage() {
  const t = useTranslations('Notifications')
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  // Fetch notifications from API
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications')
      return response.data
    },
  })

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast({ title: t('notificationRead') })
    },
  })

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast({ title: t('allNotificationsRead') })
    },
  })

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notifications/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast({ title: t('notificationDeleted') })
    },
    onError: (error: any) => {
      toast({ 
        title: 'Errore', 
        description: error.response?.data?.message || 'Errore durante l\'eliminazione',
        variant: 'destructive' 
      })
    },
  })

  // Clear all notifications mutation
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/notifications/clear-all')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast({ title: t('allNotificationsDeleted') })
    },
    onError: (error: any) => {
      console.error('Clear all error:', error)
      toast({ 
        title: 'Errore', 
        description: error.response?.data?.message || 'Errore durante l\'eliminazione',
        variant: 'destructive' 
      })
    },
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'BOOKING':
        return <PiCalendar className="h-5 w-5 text-blue-500" />
      case 'CAUTION':
        return <PiCreditCard className="h-5 w-5 text-green-500" />
      case 'DAMAGE':
        return <PiWarning className="h-5 w-5 text-red-500" />
      case 'MAINTENANCE':
        return <PiCarProfile className="h-5 w-5 text-orange-500" />
      case 'EXPIRY':
        return <PiClock className="h-5 w-5 text-yellow-500" />
      default:
        return <PiBell className="h-5 w-5 text-gray-500" />
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'BOOKING':
        return <Badge variant="default">{t('types.booking')}</Badge>
      case 'CAUTION':
        return <Badge className="bg-green-500">{t('types.caution')}</Badge>
      case 'DAMAGE':
        return <Badge variant="destructive">{t('types.damage')}</Badge>
      case 'MAINTENANCE':
        return <Badge className="bg-orange-500">{t('types.maintenance')}</Badge>
      case 'EXPIRY':
        return <Badge className="bg-yellow-500">{t('types.expiry')}</Badge>
      default:
        return <Badge variant="secondary">{t('types.system')}</Badge>
    }
  }

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications

  const unreadCount = notifications.filter(n => !n.read).length

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return t('time.minutesAgo', { count: diffMins })
    if (diffHours < 24) return t('time.hoursAgo', { count: diffHours })
    if (diffDays === 1) return t('time.yesterday')
    if (diffDays < 7) return t('time.daysAgo', { count: diffDays })
    return formatDate(dateString)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} {t('unread').toLowerCase()}</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => markAllAsReadMutation.mutate()} 
            disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
          >
            {markAllAsReadMutation.isPending ? <Loader className="mr-2" /> : <PiCheck className="mr-2 h-4 w-4" />}
            {t('markAllAsRead')}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => clearAllMutation.mutate()} 
            disabled={notifications.length === 0 || clearAllMutation.isPending}
          >
            {clearAllMutation.isPending ? <Loader className="mr-2" /> : <PiTrash className="mr-2 h-4 w-4" />}
            {t('clearAll')}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('total')}</CardTitle>
            <PiBell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('unread')}</CardTitle>
            <PiWarning className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('read')}</CardTitle>
            <PiCheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications.length - unreadCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('today')}</CardTitle>
            <PiCalendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications.filter(n => {
                const notifDate = new Date(n.createdAt)
                const today = new Date()
                return notifDate.toDateString() === today.toDateString()
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
        <TabsList>
          <TabsTrigger value="all">{t('all')} ({notifications.length})</TabsTrigger>
          <TabsTrigger value="unread">{t('unread')} ({unreadCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <PiBell className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground">
                  {filter === 'unread' ? t('noUnreadNotifications') : t('noNotifications')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={`transition-colors ${!notification.read ? 'bg-accent/50 border-primary/20' : ''}`}
                >
                  <CardContent className="flex items-start gap-4 py-4">
                    <div className="mt-1">
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{notification.title}</span>
                        {getTypeBadge(notification.type)}
                        {!notification.read && (
                          <Badge variant="secondary" className="text-xs">{t('new')}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!notification.read && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => markAsReadMutation.mutate(notification.id)}
                          disabled={markAsReadMutation.isPending}
                        >
                          {markAsReadMutation.isPending ? <Loader /> : <PiCheck className="h-4 w-4" />}
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteNotificationMutation.mutate(notification.id)}
                        disabled={deleteNotificationMutation.isPending}
                      >
                        {deleteNotificationMutation.isPending ? <Loader /> : <PiTrash className="h-4 w-4" />}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
