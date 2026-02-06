'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PiCarProfile, PiCalendar, PiMoney, PiKey, PiWarningCircle } from 'react-icons/pi'
import { useTranslations } from 'next-intl'
import { formatCurrency } from '@/lib/utils'
import { Loader } from '@/components/ui/loader'

interface DashboardStatsProps {
  stats: {
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
  } | undefined
  isLoading: boolean
}

export function DashboardStats({ stats, isLoading }: DashboardStatsProps) {
  const t = useTranslations('Dashboard')

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center py-4">
                <Loader  />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('availableCars')}</CardTitle>
          <PiCarProfile className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.availableVehicles || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('activeRentals')}</CardTitle>
          <PiCalendar className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.activeBookings || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('totalRevenue')}</CardTitle>
          <PiMoney className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('openMaintenance')}</CardTitle>
          <PiKey className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.openMaintenance || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{t('cautionsToRelease')}</CardTitle>
          <PiWarningCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.cautionsToRelease || 0}</div>
        </CardContent>
      </Card>
    </div>
  )
}
