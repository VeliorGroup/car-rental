'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PiUsers, PiCheckCircle, PiWarning, PiXCircle, PiShield } from 'react-icons/pi'
import { useTranslations } from 'next-intl'
import api from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Loader } from '@/components/ui/loader'

interface CustomerStats {
  total: number
  status: Record<string, number>
  category: Record<string, number>
}

interface CustomerChartsProps {
  search?: string
}

export function CustomerCharts({ search }: CustomerChartsProps) {
  const t = useTranslations('Customers')
  const tc = useTranslations('Common')

  const { data: stats, isLoading } = useQuery<CustomerStats>({
    queryKey: ['customers-stats-summary', search],
    queryFn: async () => {
      const params: any = {}
      if (search) params.search = search
      const response = await api.get('/customers/stats/summary', { params })
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
      case 'ACTIVE': return <PiCheckCircle className="h-4 w-4 text-green-500" />
      case 'SUSPENDED': return <PiWarning className="h-4 w-4 text-orange-500" />
      case 'BLACKLISTED': return <PiXCircle className="h-4 w-4 text-red-500" />
      case 'LICENSE_EXPIRED': return <PiShield className="h-4 w-4 text-red-500" />
      default: return <PiWarning className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return t('statusActive')
      case 'SUSPENDED': return t('statusSuspended')
      case 'BLACKLISTED': return t('statusBlacklisted')
      case 'LICENSE_EXPIRED': return t('statusLicenseExpired')
      default: return status
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'STANDARD': return t('standard')
      case 'BUSINESS': return t('business')
      case 'PREMIUM': return t('premium')
      default: return category
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-3 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{tc('totalCustomers') || 'Total Customers'}</CardTitle>
          <PiUsers className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{safeStats.total || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{tc('status')}</CardTitle>
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
          <PiUsers className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(safeStats.category || {}).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between text-sm">
                <Badge variant="secondary">{getCategoryLabel(category)}</Badge>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
