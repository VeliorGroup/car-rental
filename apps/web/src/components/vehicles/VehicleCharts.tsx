'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PiCarProfile, PiCheckCircle, PiWarning, PiXCircle, PiClock, PiWrench } from 'react-icons/pi'
import { useTranslations } from 'next-intl'
import api from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Loader } from '@/components/ui/loader'

interface VehicleStats {
  total: number
  status: Record<string, number>
  category: Record<string, number>
}

interface VehicleChartsProps {
  search?: string
  category?: string
  status?: string
}

export function VehicleCharts({ search, category, status }: VehicleChartsProps) {
  const t = useTranslations('Vehicles')
  const tc = useTranslations('Common')

  const { data: stats, isLoading } = useQuery<VehicleStats>({
    queryKey: ['vehicles-stats-summary', search, category, status],
    queryFn: async () => {
      const params: any = {}
      if (search) params.search = search
      if (category && category !== 'all') params.category = category
      if (status && status !== 'all') params.status = status
      const response = await api.get('/vehicles/stats/summary', { params })
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="flex items-center justify-center p-6 h-[120px]">
          <Loader  />
        </Card>
        <Card className="flex items-center justify-center p-6 h-[120px]">
          <Loader  />
        </Card>
        <Card className="flex items-center justify-center p-6 h-[120px]">
          <Loader  />
        </Card>
      </div>
    )
  }

  // Default to empty stats if no data
  const safeStats = stats || { total: 0, status: {}, category: {} }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return <PiCheckCircle className="h-4 w-4 text-green-500" />
      case 'RENTED': return <PiClock className="h-4 w-4 text-blue-500" />
      case 'MAINTENANCE': return <PiWrench className="h-4 w-4 text-orange-500" />
      case 'OUT_OF_SERVICE': return <PiXCircle className="h-4 w-4 text-red-500" />
      default: return <PiWarning className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return t('statusAvailable')
      case 'RENTED': return t('statusRented')
      case 'RESERVED': return t('statusReserved')
      case 'MAINTENANCE': return t('statusMaintenance')
      case 'OUT_OF_SERVICE': return t('statusOutOfService')
      default: return status
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-3 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{tc('totalVehicles')}</CardTitle>
          <PiCarProfile className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{safeStats.total || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('sectionStatus')}</CardTitle>
          <PiCheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(safeStats.status || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {getStatusIcon(status)}
                  <span>{getStatusLabel(status)}</span>
                </div>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('category')}</CardTitle>
          <PiCarProfile className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(safeStats.category || {}).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between text-sm">
                <Badge variant="secondary">{category}</Badge>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
