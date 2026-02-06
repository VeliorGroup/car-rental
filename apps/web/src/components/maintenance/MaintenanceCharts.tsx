'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PiWrench, PiCheckCircle, PiClock, PiWarning } from 'react-icons/pi'
import { useTranslations } from 'next-intl'
import api from '@/lib/api'
import { Loader } from '@/components/ui/loader'

interface MaintenanceStats {
  totalMaintenances: number
  byStatus: Record<string, number>
  byType: Record<string, number>
  byPriority: Record<string, number>
  overdueCount: number
  avgCompletionTime: number
}

interface MaintenanceChartsProps {
  startDate?: string
  endDate?: string
  search?: string
}

export function MaintenanceCharts({ startDate, endDate, search }: MaintenanceChartsProps) {
  const t = useTranslations('Maintenance')
  const tc = useTranslations('Common')

  const { data: stats, isLoading } = useQuery<MaintenanceStats>({
    queryKey: ['maintenance-stats-summary', startDate, endDate, search],
    queryFn: async () => {
      const params: any = {}
      if (startDate) params.startFrom = new Date(startDate).toISOString()
      if (endDate) params.endTo = new Date(endDate).toISOString()
      if (search) params.search = search
      
      const response = await api.get('/maintenance/stats/summary', { params })
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="flex items-center justify-center p-6 h-[120px]">
            <Loader  />
          </Card>
        ))}
      </div>
    )
  }

  // Default to empty stats if no data
  const byStatus = stats?.byStatus ?? {} as Record<string, number>
  const overdueCount = stats?.overdueCount ?? 0

  const scheduledCount = byStatus['SCHEDULED'] || 0
  const inProgressCount = byStatus['IN_PROGRESS'] || 0
  const completedCount = byStatus['COMPLETED'] || 0

  return (
    <div className="grid gap-4 md:grid-cols-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('scheduled')}</CardTitle>
          <PiClock className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{scheduledCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('inProgress')}</CardTitle>
          <PiWrench className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{inProgressCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('completed')}</CardTitle>
          <PiCheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completedCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('priorityUrgent') || 'Overdue'}</CardTitle>
          <PiWarning className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overdueCount}</div>
        </CardContent>
      </Card>
    </div>
  )
}
