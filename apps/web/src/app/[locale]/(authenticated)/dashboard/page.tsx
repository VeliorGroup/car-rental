'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/lib/store/auth'
import { useQuery } from '@tanstack/react-query'
import { Loader } from '@/components/ui/loader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, Wrench, ChevronDown, ChevronUp, Wallet } from 'lucide-react'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { useDateFilter } from '@/components/layout/date-filter-context'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { MonthlyTrendChart } from '@/components/dashboard/MonthlyTrendChart'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'

interface DashboardData {
  totalVehicles: number
  availableVehicles: number
  activeBookings: number
  todayRevenue: number
  totalRevenue: number
  openMaintenance: number
  cautionsToRelease: number
  pendingDamages: number
  expiringLicenses: number
  expiringInsurances: number
}

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

interface VehicleProfitability {
  vehicleId: string
  vehicle: string
  licensePlate: string
  category: string
  bookings: number
  revenue: number
  maintenanceCost: number
  damageCost: number
  totalCosts: number
  profit: number
  isProfit: boolean
}

export default function DashboardPage() {
  const { token, isAuthenticated } = useAuthStore()
  const [isHydrated, setIsHydrated] = useState(false)
  const [showAllVehicles, setShowAllVehicles] = useState(false)
  const t = useTranslations('Dashboard')
  const params = useParams()
  const locale = params.locale as string || 'en'
  const { startDate, endDate } = useDateFilter()

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (isHydrated && (!token || !isAuthenticated)) {
      window.location.href = '/login'
    }
  }, [isHydrated, token, isAuthenticated])

  const { data: periodAnalytics, isLoading: isPeriodLoading } = useQuery<PeriodAnalytics>({
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

  const { data: vehicleProfitability, isLoading: isProfitabilityLoading } = useQuery<VehicleProfitability[]>({
    queryKey: ['vehicle-profitability', startDate, endDate],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const queryString = new URLSearchParams(params).toString()
      const response = await api.get(`/analytics/vehicle-profitability${queryString ? '?' + queryString : ''}`)
      return response.data
    },
    enabled: !!token,
  })

  if (!isHydrated) {
    return <div className="p-8 flex justify-center"><Loader /></div>
  }

  if (!token || !isAuthenticated) {
    return null
  }

  const displayVehicles = showAllVehicles 
    ? vehicleProfitability 
    : vehicleProfitability?.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <DashboardCharts startDate={startDate} endDate={endDate} />

      {/* Monthly Trend Chart - Full width */}
      <MonthlyTrendChart />

      {/* Vehicle Profitability - Full width below */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('vehicleProfitability')}</CardTitle>
          <CardDescription>{t('vehicleProfitabilityDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
           {isProfitabilityLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader />
            </div>
          ) : vehicleProfitability && vehicleProfitability.length > 0 ? (
            <div className="space-y-1">
              {/* Header - hidden on mobile */}
              <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 text-sm font-medium text-muted-foreground border-b">
                <div className="col-span-1">#</div>
                <div className="col-span-5">{t('vehicle')}</div>
                <div className="col-span-2 text-right">{t('revenueShort')}</div>
                <div className="col-span-2 text-right">{t('costsShort')}</div>
                <div className="col-span-2 text-right">{t('profitShort')}</div>
              </div>
              {/* Rows - Desktop grid, Mobile cards */}
              <div className="space-y-2 md:space-y-1">
                {displayVehicles?.map((v, index) => (
                  <div 
                    key={v.vehicleId} 
                    className={`rounded-md text-sm transition-colors ${
                      v.isProfit 
                        ? 'hover:bg-muted/50' 
                        : 'bg-destructive/10 hover:bg-destructive/15'
                    }`}
                  >
                    {/* Desktop layout */}
                    <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2">
                      <div className="col-span-1 font-medium text-muted-foreground">{index + 1}</div>
                      <div className="col-span-5">
                        <Link href={`/${locale}/vehicles/${v.vehicleId}`} className="hover:text-primary flex items-center gap-2">
                          <span className="font-medium">{v.vehicle}</span>
                          <span className="text-xs text-muted-foreground">{v.licensePlate}</span>
                        </Link>
                      </div>
                      <div className="col-span-2 text-right font-medium text-success">
                        {formatCurrency(v.revenue)}
                      </div>
                      <div className="col-span-2 text-right text-muted-foreground">
                        {formatCurrency(v.totalCosts)}
                      </div>
                      <div className={`col-span-2 text-right font-bold ${v.isProfit ? 'text-success' : 'text-destructive'}`}>
                        {v.isProfit ? '+' : ''}{formatCurrency(v.profit)}
                      </div>
                    </div>
                    {/* Mobile layout */}
                    <Link href={`/${locale}/vehicles/${v.vehicleId}`} className="md:hidden block p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{v.vehicle}</span>
                        <span className={`font-bold ${v.isProfit ? 'text-success' : 'text-destructive'}`}>
                          {v.isProfit ? '+' : ''}{formatCurrency(v.profit)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{v.licensePlate}</span>
                        <span>{t('revenueShort')}: {formatCurrency(v.revenue)}</span>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
              {vehicleProfitability.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => setShowAllVehicles(!showAllVehicles)}
                >
                  {showAllVehicles ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                  {showAllVehicles ? t('showLess') : `${t('showAll')} (${vehicleProfitability.length})`}
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">{t('noVehicleData')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
