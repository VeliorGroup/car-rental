'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader } from '@/components/ui/loader'
import { TrendingUp } from 'lucide-react'
import api from '@/lib/api'
import { useTranslations } from 'next-intl'
import { formatCurrency } from '@/lib/utils'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface MonthlyData {
  month: string
  monthLabel: string
  bookings: number
  revenue: number
  costs: number
  profit: number
}

export function MonthlyTrendChart() {
  const t = useTranslations('Dashboard')

  const { data: monthlyData, isLoading } = useQuery<MonthlyData[]>({
    queryKey: ['monthly-trend'],
    queryFn: async () => {
      const response = await api.get('/analytics/monthly-trend')
      return response.data
    },
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            {t('monthlyTrend')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[350px] items-center justify-center">
            <Loader />
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasData = monthlyData && monthlyData.some(d => d.revenue > 0 || d.costs > 0)

  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          {t('monthlyTrend')}
        </CardTitle>
        <CardDescription>{t('monthlyTrendDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlyData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCosts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="monthLabel" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `€${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number | undefined, name: string | undefined) => [
                    formatCurrency(value ?? 0),
                    name === 'revenue' ? t('revenueLabel') : 
                    name === 'costs' ? t('costsLabel') : 
                    t('profitLabel')
                  ]}
                  labelFormatter={(label) => label}
                />
                <Legend 
                  formatter={(value) => 
                    value === 'revenue' ? t('revenueLabel') : 
                    value === 'costs' ? t('costsLabel') : 
                    t('profitLabel')
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#22c55e"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
                <Area
                  type="monotone"
                  dataKey="costs"
                  stroke="#ef4444"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorCosts)"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorProfit)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('noMonthlyData')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
