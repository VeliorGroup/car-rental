'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, Wrench, Wallet } from 'lucide-react'
import { useTranslations } from 'next-intl'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Loader } from '@/components/ui/loader'

interface PeriodAnalytics {
  period: {
    startDate: string
    endDate: string
    days: number
  }
  bookings: {
    total: number
    completed: number
    active: number
    cancelled: number
  }
  vehicles: {
    totalBooked: number
    totalBookedDays: number
    utilizationRate: number
  }
  revenue: {
    total: number
    expected: number
    avgDaily: number
    avgBookingValue: number
  }
  costs: {
    maintenance: number
    damages: number
    total: number
  }
  profitLoss: {
    amount: number
    isProfit: boolean
    margin: number
  }
}

interface DashboardChartsProps {
  startDate?: string
  endDate?: string
}

export function DashboardCharts({ startDate, endDate }: DashboardChartsProps) {
  const t = useTranslations('Dashboard')
  const { token } = useAuthStore()

  const { data: periodAnalytics, isLoading } = useQuery<PeriodAnalytics>({
    queryKey: ['period-analytics', startDate, endDate],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const queryString = new URLSearchParams(params).toString()
      const response = await api.get(`/analytics/period${queryString ? '?' + queryString : ''}`)
      return response.data
    },
    enabled: !!token,
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="flex items-center justify-center p-6 h-[120px]">
            <Loader />
          </Card>
        ))}
      </div>
    )
  }

  // Default to empty stats if no data
  const safeStats = periodAnalytics || {
    profitLoss: { isProfit: true, amount: 0, margin: 0 },
    revenue: { total: 0, avgDaily: 0, expected: 0 },
    costs: { total: 0, maintenance: 0 },
    bookings: { active: 0 }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {/* Profit/Loss */}
      <Card className={
        safeStats.profitLoss.isProfit 
          ? 'bg-success/5 border-success/20' 
          : 'bg-destructive/5 border-destructive/20'
      }>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {safeStats.profitLoss.isProfit ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            {t('profitLoss')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${
            safeStats.profitLoss.isProfit ? 'text-success' : 'text-destructive'
          }`}>
            {safeStats.profitLoss.isProfit ? '+' : ''}{formatCurrency(safeStats.profitLoss.amount || 0)}
          </p>
          <p className="text-xs text-muted-foreground">{t('margin')}: {safeStats.profitLoss.margin || 0}%</p>
        </CardContent>
      </Card>

      {/* Revenue */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            {t('totalRevenue')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(safeStats.revenue.total || 0)}</p>
          <p className="text-xs text-muted-foreground">{t('avgDaily')}: {formatCurrency(safeStats.revenue.avgDaily || 0)}</p>
        </CardContent>
      </Card>

      {/* Costs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            {t('totalCosts')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(safeStats.costs.total || 0)}</p>
          <p className="text-xs text-muted-foreground">{t('maintenance')}: {formatCurrency(safeStats.costs.maintenance || 0)}</p>
        </CardContent>
      </Card>

      {/* Expected */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wallet className="h-4 w-4 text-blue-500" />
            {t('expectedRevenue')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(safeStats.revenue.expected || 0)}</p>
          <p className="text-xs text-muted-foreground">{safeStats.bookings.active || 0} {t('activeBookings')?.toLowerCase()}</p>
        </CardContent>
      </Card>
    </div>
  )
}
