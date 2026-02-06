'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PiCreditCard, PiCheckCircle, PiWarningCircle, PiCurrencyDollar } from 'react-icons/pi'
import { useTranslations } from 'next-intl'
import api from '@/lib/api'
import { Loader } from '@/components/ui/loader'
import { formatCurrency } from '@/lib/utils'

interface CautionStats {
  totalHeld: number
  totalReleased: number
  totalCharged: number
  totalAmountHeld: number
  totalAmountReleased: number
  totalAmountCharged: number
}

interface CautionChartsProps {
  startDate?: string
  endDate?: string
  search?: string
}

export function CautionCharts({ startDate, endDate, search }: CautionChartsProps) {
  const t = useTranslations('Cautions')
  const tc = useTranslations('Common')

  const { data: stats, isLoading } = useQuery<CautionStats>({
    queryKey: ['cautions-stats', startDate, endDate, search],
    queryFn: async () => {
      const params: any = {}
      if (startDate) params.startFrom = new Date(startDate).toISOString()
      if (endDate) params.endTo = new Date(endDate).toISOString()
      if (search) params.search = search
      
      const response = await api.get('/cautions/stats/summary', { params })
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card className="flex items-center justify-center p-6 h-[120px]">
          <Loader  />
        </Card>
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
  const safeStats = stats || { 
    totalHeld: 0, totalReleased: 0, totalCharged: 0,
    totalAmountHeld: 0, totalAmountReleased: 0, totalAmountCharged: 0 
  }

  return (
    <div className="grid gap-4 md:grid-cols-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('held')}</CardTitle>
          <PiCreditCard className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(safeStats.totalAmountHeld || 0)}</div>
          <p className="text-xs text-muted-foreground">
            {safeStats.totalHeld || 0} {tc('items')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('released')}</CardTitle>
          <PiCheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(safeStats.totalAmountReleased || 0)}</div>
          <p className="text-xs text-muted-foreground">
            {safeStats.totalReleased || 0} {tc('items')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('charged')}</CardTitle>
          <PiCurrencyDollar className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(safeStats.totalAmountCharged || 0)}</div>
          <p className="text-xs text-muted-foreground">
            {safeStats.totalCharged || 0} {tc('items')}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('pendingRelease')}</CardTitle>
          <PiWarningCircle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{safeStats.totalHeld || 0}</div>
          <p className="text-xs text-muted-foreground">
            {t('activeCautions')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
