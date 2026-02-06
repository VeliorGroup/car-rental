'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store/auth'
import { useTranslations, useFormatter } from 'next-intl'
import { useParams } from 'next/navigation'
import { Car, Calendar, Wrench, AlertTriangle, LogOut, LogIn, User, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import Link from 'next/link'
import api from '@/lib/api'
import { cn } from '@/lib/utils'

interface DashboardData {
  totalVehicles: number
  availableVehicles: number
  activeBookings: number
  openMaintenance: number
  pendingDamages: number
}

interface Movement {
  id: string
  vehicle: string
  licensePlate: string
  customer: string
  customerPhone: string
  time: string
}

interface TodayMovements {
  checkouts: Movement[]
  returns: Movement[]
}

interface DailySummaryProps {
  isOpen: boolean
  onClose: () => void
  onOpen: () => void
}

export function DailySummarySidebar({ isOpen, onClose, onOpen }: DailySummaryProps) {
  const { token } = useAuthStore()
  const t = useTranslations('Dashboard')
  const params = useParams()
  const locale = params.locale as string || 'en'

  const { data: stats, isLoading: isStatsLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/analytics/dashboard')
      return response.data
    },
    enabled: !!token,
  })

  const { data: todayMovements, isLoading: isMovementsLoading } = useQuery<TodayMovements>({
    queryKey: ['today-movements'],
    queryFn: async () => {
      const response = await api.get('/analytics/today-movements')
      return response.data
    },
    enabled: !!token,
  })

  // Usa useFormatter per la data formattata in modo consistente con next-intl
  const format = useFormatter()
  const formattedDate = format.dateTime(new Date(), { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long' 
  })

  return (
    <>
      {/* Tab per riaprire quando chiusa */}
      {!isOpen && (
        <button
          onClick={onOpen}
          className="fixed right-0 bottom-40 z-30 bg-primary text-primary-foreground px-2 py-4 rounded-l-lg shadow-lg hover:bg-primary/90 transition-colors"
          title={t('dailySummary') || 'Riepilogo'}
        >
          <span 
            className="text-xs font-medium"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            {t('dailySummary') || 'Riepilogo'}
          </span>
        </button>
      )}
      
      <div
        className={cn(
          "fixed right-0 top-0 h-screen bg-card border-l border-border transition-transform duration-300 ease-in-out z-30 flex flex-col",
          "w-96",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-border">
        <div>
          <h3 className="font-semibold text-sm">{t('dailySummaryTitle') || 'Riepilogo Giornaliero'}</h3>
          <p className="text-xs text-muted-foreground capitalize">{formattedDate}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Today's Movements */}
        <div className="space-y-3">
          {/* Checkouts */}
          <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <div className="p-1 rounded-full bg-green-500/10">
                  <LogOut className="h-3 w-3 text-green-600" />
                </div>
                {t('checkoutsToday')}
                <span className="ml-auto font-bold text-green-600">
                  {todayMovements?.checkouts.length || 0}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {isMovementsLoading ? (
                <Loader  />
              ) : todayMovements?.checkouts.length ? (
                <div className="space-y-1.5">
                  {todayMovements.checkouts.slice(0, 3).map((m) => (
                    <Link 
                      key={m.id} 
                      href={`/${locale}/bookings/${m.id}`}
                      className="flex items-center justify-between p-1.5 rounded hover:bg-muted transition-colors text-xs"
                    >
                      <div>
                        <p className="font-medium">{m.vehicle}</p>
                        <p className="text-muted-foreground">{m.licensePlate}</p>
                      </div>
                      <div className="text-right">
                        <p className="flex items-center gap-1">
                          <User className="h-2.5 w-2.5" />
                          {m.customer}
                        </p>
                      </div>
                    </Link>
                  ))}
                  {todayMovements.checkouts.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{todayMovements.checkouts.length - 3} {t('more')}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">{t('noCheckoutsToday')}</p>
              )}
            </CardContent>
          </Card>

          {/* Returns */}
          <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <div className="p-1 rounded-full bg-blue-500/10">
                  <LogIn className="h-3 w-3 text-blue-600" />
                </div>
                {t('returnsToday')}
                <span className="ml-auto font-bold text-blue-600">
                  {todayMovements?.returns.length || 0}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {isMovementsLoading ? (
                <Loader  />
              ) : todayMovements?.returns.length ? (
                <div className="space-y-1.5">
                  {todayMovements.returns.slice(0, 3).map((m) => (
                    <Link 
                      key={m.id} 
                      href={`/${locale}/bookings/${m.id}`}
                      className="flex items-center justify-between p-1.5 rounded hover:bg-muted transition-colors text-xs"
                    >
                      <div>
                        <p className="font-medium">{m.vehicle}</p>
                        <p className="text-muted-foreground">{m.licensePlate}</p>
                      </div>
                      <div className="text-right">
                        <p className="flex items-center gap-1">
                          <User className="h-2.5 w-2.5" />
                          {m.customer}
                        </p>
                      </div>
                    </Link>
                  ))}
                  {todayMovements.returns.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{todayMovements.returns.length - 3} {t('more')}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">{t('noReturnsToday')}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
            {t('quickStats') || 'Stato Flotta'}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/${locale}/vehicles`}>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Car className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">
                        {isStatsLoading ? '-' : `${stats?.availableVehicles || 0}/${stats?.totalVehicles || 0}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{t('availableVehicles')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href={`/${locale}/bookings`}>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{isStatsLoading ? '-' : stats?.activeBookings || 0}</p>
                      <p className="text-xs text-muted-foreground">{t('activeBookings')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href={`/${locale}/maintenance`}>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Wrench className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-2xl font-bold">{isStatsLoading ? '-' : stats?.openMaintenance || 0}</p>
                      <p className="text-xs text-muted-foreground">{t('openMaintenance')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href={`/${locale}/damages`}>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold">{isStatsLoading ? '-' : stats?.pendingDamages || 0}</p>
                      <p className="text-xs text-muted-foreground">{t('pendingDamages')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
      </div>
    </>
  )
}
