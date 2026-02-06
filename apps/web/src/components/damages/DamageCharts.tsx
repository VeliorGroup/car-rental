'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PiWarning, PiCheckCircle, PiClock, PiWarningCircle } from 'react-icons/pi'
import { useTranslations } from 'next-intl'
import api from '@/lib/api'
import { Loader } from '@/components/ui/loader'
import { formatCurrency } from '@/lib/utils'

interface DamageStats {
  totalDamages: number
  totalCost: number
  bySeverity: Record<string, number>
  byStatus: Record<string, number>
  disputedCount: number
}

interface DamageChartsProps {
  startDate?: string
  endDate?: string
  search?: string
}

export function DamageCharts({ startDate, endDate, search }: DamageChartsProps) {
  const t = useTranslations('Damages')
  const tc = useTranslations('Common')

  const { data: stats, isLoading } = useQuery<DamageStats>({
    queryKey: ['damages-stats-summary', startDate, endDate, search],
    queryFn: async () => {
      const params: any = {}
      if (startDate) params.startFrom = new Date(startDate).toISOString()
      if (endDate) params.endTo = new Date(endDate).toISOString()
      if (search) params.search = search
      
      const response = await api.get('/damages/stats/summary', { params })
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="flex items-center justify-center p-6 h-[120px]">
            <Loader  />
          </Card>
        ))}
      </div>
    )
  }

  // Default to empty stats if no data
  const safeStats = stats || { 
    totalDamages: 0, totalCost: 0, disputedCount: 0, 
    byStatus: {}, bySeverity: {} 
  }

  const pendingCount = (safeStats.byStatus['REPORTED'] || 0) + (safeStats.byStatus['UNDER_REVIEW'] || 0)
  const resolvedCount = (safeStats.byStatus['RESOLVED'] || 0) + (safeStats.byStatus['CHARGED'] || 0)

  return (
    <div className="grid gap-4 md:grid-cols-5 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('totalDamages')}</CardTitle>
          <PiWarning className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{safeStats.totalDamages || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('pending')}</CardTitle>
          <PiClock className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('disputed')}</CardTitle>
          <PiWarningCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{safeStats.disputedCount || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('resolved')}</CardTitle>
          <PiCheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{resolvedCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('totalCost')}</CardTitle>
          <PiWarning className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(safeStats.totalCost || 0)}</div>
        </CardContent>
      </Card>
    </div>
  )
}
