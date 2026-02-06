'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PiCalendar, PiCheckCircle, PiClock, PiXCircle, PiWarning, PiUserMinus, PiArrowUpRight, PiArrowDownLeft } from 'react-icons/pi'
import { useTranslations } from 'next-intl'
import api from '@/lib/api'
import { Loader } from '@/components/ui/loader'

interface BookingStats {
  total: number
  status: Record<string, number>
  pickups: number
  returns: number
}

interface BookingChartsProps {
  startDate?: string
  endDate?: string
}

export function BookingCharts({ startDate, endDate }: BookingChartsProps) {
  const t = useTranslations('Bookings')
  const tc = useTranslations('Common')

  const { data: stats, isLoading } = useQuery<BookingStats>({
    queryKey: ['bookings-stats-summary', startDate, endDate],
    queryFn: async () => {
      const params: any = {}
      if (startDate) params.startFrom = new Date(startDate).toISOString()
      if (endDate) params.startTo = new Date(endDate).toISOString()
      
      const response = await api.get('/bookings/stats/summary', { params })
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4 mb-6">
        <div className="grid gap-4 md:grid-cols-3">
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
        <Card className="flex items-center justify-center p-6 h-[200px]">
          <Loader  />
        </Card>
      </div>
    )
  }

  // Default to empty stats if no data
  const safeStats = stats || { total: 0, pickups: 0, returns: 0, status: {} }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return <PiCheckCircle className="h-4 w-4 text-blue-500" />
      case 'CHECKED_OUT': return <PiClock className="h-4 w-4 text-green-500" />
      case 'CHECKED_IN': return <PiCheckCircle className="h-4 w-4 text-gray-500" />
      case 'CANCELLED': return <PiXCircle className="h-4 w-4 text-red-500" />
      case 'NO_SHOW': return <PiUserMinus className="h-4 w-4 text-red-500" />
      default: return <PiWarning className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return t('statusConfirmed')
      case 'CHECKED_OUT': return t('statusCheckedOut')
      case 'CHECKED_IN': return t('statusCheckedIn')
      case 'CANCELLED': return t('statusCancelled')
      case 'NO_SHOW': return t('statusNoShow')
      default: return status
    }
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{tc('totalBookings') || 'Total Bookings'}</CardTitle>
            <PiCalendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeStats.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('pickups') || 'Pickups'}</CardTitle>
            <PiArrowUpRight className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeStats.pickups || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('returns') || 'Returns'}</CardTitle>
            <PiArrowDownLeft className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeStats.returns || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{tc('status')}</CardTitle>
          <PiCheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {Object.entries(safeStats.status || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between p-2 border rounded-md">
                <div className="flex items-center gap-2">
                  {getStatusIcon(status)}
                  <span className="text-sm font-medium">{getStatusLabel(status)}</span>
                </div>
                <span className="font-bold">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
