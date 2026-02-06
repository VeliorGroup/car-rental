'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PiTire, PiWarningCircle, PiCircleDashed, PiWarehouse } from 'react-icons/pi'
import { useTranslations } from 'next-intl'
import api from '@/lib/api'
import { Loader } from '@/components/ui/loader'

interface TireStats {
  total: number
  mounted: number
  stored: number
  needReplacement: number
}

interface TireChartsProps {
  startDate?: string
  endDate?: string
  search?: string
}

export function TireCharts({ startDate, endDate, search }: TireChartsProps) {
  const t = useTranslations('Tires')

  const { data: stats, isLoading } = useQuery<TireStats>({
    queryKey: ['tires-stats-summary', startDate, endDate, search],
    queryFn: async () => {
      const params: any = {}
      if (startDate) params.startFrom = new Date(startDate).toISOString()
      if (endDate) params.endTo = new Date(endDate).toISOString()
      if (search) params.search = search
      
      const response = await api.get('/tires/stats/summary', { params })
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="flex items-center justify-center p-6 h-[120px]">
            <Loader />
          </Card>
        ))}
      </div>
    )
  }

  // Default to empty stats if no data
  const safeStats = stats || { total: 0, mounted: 0, stored: 0, needReplacement: 0 }

  return (
    <div className="grid gap-4 md:grid-cols-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('total')}</CardTitle>
          <PiTire className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{safeStats.total || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('mounted')}</CardTitle>
          <PiCircleDashed className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{safeStats.mounted || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('stored')}</CardTitle>
          <PiWarehouse className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{safeStats.stored || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('needReplacement')}</CardTitle>
          <PiWarningCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{safeStats.needReplacement || 0}</div>
        </CardContent>
      </Card>
    </div>
  )
}
