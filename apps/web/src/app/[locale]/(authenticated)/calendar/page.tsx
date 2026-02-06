'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Car, User } from 'lucide-react'
import api from '@/lib/api'
import { formatDate } from '@/lib/utils'

interface Booking {
  id: string
  startDate: string
  endDate: string
  status: 'CONFIRMED' | 'CHECKED_OUT' | 'CHECKED_IN' | 'CANCELLED' | 'NO_SHOW'
  customer: {
    firstName: string
    lastName: string
  }
  vehicle: {
    brand: string
    model: string
    licensePlate: string
  }
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('month')
  const t = useTranslations('Calendar')
  const tb = useTranslations('Bookings')
  const router = useRouter()
  const params = useParams()
  const locale = params.locale as string || 'en'

  const navigateToBooking = (bookingId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/${locale}/bookings/${bookingId}`)
  }

  const DAYS = [
    t('days.sun'), t('days.mon'), t('days.tue'), t('days.wed'), 
    t('days.thu'), t('days.fri'), t('days.sat')
  ]
  
  const MONTHS = [
    t('months.january'), t('months.february'), t('months.march'), t('months.april'),
    t('months.may'), t('months.june'), t('months.july'), t('months.august'),
    t('months.september'), t('months.october'), t('months.november'), t('months.december')
  ]

  const startOfMonth = useMemo(() => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    return date
  }, [currentDate])

  const endOfMonth = useMemo(() => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    return date
  }, [currentDate])

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['calendar-bookings', startOfMonth.toISOString(), endOfMonth.toISOString()],
    queryFn: async () => {
      const response = await api.get('/bookings', {
        params: {
          startFrom: startOfMonth.toISOString(),
          startTo: endOfMonth.toISOString(),
          limit: 100,
        },
      })
      return response.data?.bookings || []
    },
  })

  const calendarDays = useMemo(() => {
    const days: (Date | null)[] = []
    const firstDay = startOfMonth.getDay()
    
    // Add empty days for the beginning
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let i = 1; i <= endOfMonth.getDate(); i++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i))
    }
    
    return days
  }, [startOfMonth, endOfMonth, currentDate])

  const getBookingsForDate = (date: Date) => {
    if (!bookings) return []
    // Normalize the check date to midnight
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    return bookings.filter((booking: Booking) => {
      const start = new Date(booking.startDate)
      const end = new Date(booking.endDate)
      // Normalize start and end to midnight for date-only comparison
      const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate())
      const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate())
      
      return checkDate >= startDate && checkDate <= endDate
    })
  }

  // Cars going OUT (pickup) - startDate matches
  const getPickupsForDate = (date: Date) => {
    if (!bookings) return []
    return bookings.filter((booking: Booking) => {
      const start = new Date(booking.startDate)
      return date.getDate() === start.getDate() &&
        date.getMonth() === start.getMonth() &&
        date.getFullYear() === start.getFullYear()
    })
  }

  // Cars coming BACK (dropoff) - endDate matches
  const getDropoffsForDate = (date: Date) => {
    if (!bookings) return []
    return bookings.filter((booking: Booking) => {
      const end = new Date(booking.endDate)
      return date.getDate() === end.getDate() &&
        date.getMonth() === end.getMonth() &&
        date.getFullYear() === end.getFullYear()
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-blue-500'
      case 'CHECKED_OUT':
        return 'bg-green-500'
      case 'CHECKED_IN':
        return 'bg-gray-500'
      case 'CANCELLED':
        return 'bg-red-500'
      case 'NO_SHOW':
        return 'bg-red-400'
      default:
        return 'bg-gray-400'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return tb('statusConfirmed')
      case 'CHECKED_OUT':
        return tb('statusCheckedOut')
      case 'CHECKED_IN':
        return tb('statusCheckedIn')
      case 'CANCELLED':
        return tb('statusCancelled')
      case 'NO_SHOW':
        return tb('statusNoShow')
      default:
        return status
    }
  }

  // Navigation based on view mode
  const navigatePrevious = () => {
    if (viewMode === 'day') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1))
    } else if (viewMode === 'week') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7))
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    }
    setSelectedDate(null)
  }

  const navigateNext = () => {
    if (viewMode === 'day') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1))
    } else if (viewMode === 'week') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7))
    } else {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    }
    setSelectedDate(null)
  }

  // Get days of the current week
  const getWeekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    startOfWeek.setDate(startOfWeek.getDate() - day) // Go to Sunday
    
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      days.push(new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i))
    }
    return days
  }, [currentDate])

  const today = new Date()
  const isToday = (date: Date) => {
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
  }

  const selectedDateBookings = selectedDate ? getBookingsForDate(selectedDate) : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {viewMode === 'day' && formatDate(currentDate.toISOString())}
              {viewMode === 'week' && `${t('week')} - ${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
              {viewMode === 'month' && `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
            </CardTitle>
            <div className="flex gap-2">
              <div className="inline-flex rounded-lg border bg-muted p-0.5">
                <button 
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    viewMode === 'day' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setViewMode('day')}
                >
                  {t('view.day')}
                </button>
                <button 
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    viewMode === 'week' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setViewMode('week')}
                >
                  {t('view.week')}
                </button>
                <button 
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    viewMode === 'month' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setViewMode('month')}
                >
                  {t('view.month')}
                </button>
              </div>
              <Button variant="outline" size="icon" onClick={navigatePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={navigateNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* MONTH VIEW */}
            {viewMode === 'month' && (
              <>
                {/* Days header */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {DAYS.map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((date, index) => {
                    if (!date) {
                      return <div key={`empty-${index}`} className="h-24 bg-muted/30 rounded-md" />
                    }

                    const isSelected = selectedDate && 
                      date.getDate() === selectedDate.getDate() &&
                      date.getMonth() === selectedDate.getMonth()

                    return (
                      <div
                        key={date.toISOString()}
                        className={`h-24 p-1 border rounded-md cursor-pointer transition-colors hover:bg-accent/50 ${
                          isToday(date) ? 'border-primary border-2' : 'border-border'
                        } ${isSelected ? 'bg-green-600/30 border-green-500 border-2' : ''}`}
                        onClick={() => setSelectedDate(date)}
                      >
                        <div className={`text-sm font-medium mb-1 ${
                          isToday(date) ? 'text-primary' : ''
                        }`}>
                          {date.getDate()}
                        </div>
                        <div className="space-y-0.5 overflow-y-auto max-h-16">
                          {/* Pickups - Cars going OUT (green) */}
                          {getPickupsForDate(date).map((booking: Booking) => (
                            <div
                              key={`out-${booking.id}`}
                              className="text-[10px] px-1 py-0.5 rounded text-white truncate bg-rose-500/90 flex items-center gap-0.5 cursor-pointer hover:bg-rose-600"
                              title={`USCITA: ${booking.vehicle.brand} ${booking.vehicle.model} - ${booking.customer.firstName} ${booking.customer.lastName}`}
                              onClick={(e) => navigateToBooking(booking.id, e)}
                            >
                              ↑ {booking.vehicle.licensePlate}
                            </div>
                          ))}
                          {/* Dropoffs - Cars coming BACK (orange) */}
                          {getDropoffsForDate(date).map((booking: Booking) => (
                            <div
                              key={`in-${booking.id}`}
                              className="text-[10px] px-1 py-0.5 rounded text-white truncate bg-emerald-500/90 flex items-center gap-0.5 cursor-pointer hover:bg-emerald-600"
                              title={`RIENTRO: ${booking.vehicle.brand} ${booking.vehicle.model} - ${booking.customer.firstName} ${booking.customer.lastName}`}
                              onClick={(e) => navigateToBooking(booking.id, e)}
                            >
                              ↓ {booking.vehicle.licensePlate}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* WEEK VIEW */}
            {viewMode === 'week' && (
              <>
                {/* Days header */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {getWeekDays.map((date) => (
                    <div key={date.toISOString()} className="text-center text-sm font-medium text-muted-foreground py-2">
                      <div>{DAYS[date.getDay()]}</div>
                      <div className={`text-lg ${isToday(date) ? 'text-primary font-bold' : ''}`}>{date.getDate()}</div>
                    </div>
                  ))}
                </div>
                
                {/* Week grid */}
                <div className="grid grid-cols-7 gap-1">
                  {getWeekDays.map((date) => {
                    const isSelected = selectedDate && 
                      date.getDate() === selectedDate.getDate() &&
                      date.getMonth() === selectedDate.getMonth()

                    return (
                      <div
                        key={date.toISOString()}
                        className={`min-h-[200px] p-2 border rounded-md cursor-pointer transition-colors hover:bg-accent/50 ${
                          isToday(date) ? 'border-primary border-2' : 'border-border'
                        } ${isSelected ? 'bg-green-600/30 border-green-500 border-2' : ''}`}
                        onClick={() => setSelectedDate(date)}
                      >
                        <div className="space-y-1">
                          {/* Pickups */}
                          {getPickupsForDate(date).map((booking: Booking) => (
                            <div
                              key={`out-${booking.id}`}
                              className="text-xs px-2 py-1 rounded text-white bg-rose-500/90 cursor-pointer hover:bg-rose-600"
                              title={`USCITA: ${booking.vehicle.brand} ${booking.vehicle.model}`}
                              onClick={(e) => navigateToBooking(booking.id, e)}
                            >
                              <div className="font-medium">↑ {booking.vehicle.licensePlate}</div>
                              <div className="truncate">{booking.customer.lastName}</div>
                            </div>
                          ))}
                          {/* Dropoffs */}
                          {getDropoffsForDate(date).map((booking: Booking) => (
                            <div
                              key={`in-${booking.id}`}
                              className="text-xs px-2 py-1 rounded text-white bg-emerald-500/90 cursor-pointer hover:bg-emerald-600"
                              title={`RIENTRO: ${booking.vehicle.brand} ${booking.vehicle.model}`}
                              onClick={(e) => navigateToBooking(booking.id, e)}
                            >
                              <div className="font-medium">↓ {booking.vehicle.licensePlate}</div>
                              <div className="truncate">{booking.customer.lastName}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* DAY VIEW */}
            {viewMode === 'day' && (
              <div className="space-y-4">
                <div className={`text-center py-4 border rounded-md ${isToday(currentDate) ? 'border-primary border-2' : ''}`}>
                  <div className="text-lg font-medium">{DAYS[currentDate.getDay()]}</div>
                  <div className="text-4xl font-bold">{currentDate.getDate()}</div>
                  <div className="text-muted-foreground">{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Pickups */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-rose-500 flex items-center gap-2">↑ {t('pickups') || 'Uscite'}</h4>
                    {getPickupsForDate(currentDate).length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('noPickups') || 'Nessuna uscita'}</p>
                    ) : (
                      getPickupsForDate(currentDate).map((booking: Booking) => (
                        <div 
                          key={booking.id} 
                          className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg cursor-pointer hover:bg-rose-500/20"
                          onClick={() => router.push(`/${locale}/bookings/${booking.id}`)}
                        >
                          <div className="font-medium">{booking.vehicle.licensePlate}</div>
                          <div className="text-sm">{booking.vehicle.brand} {booking.vehicle.model}</div>
                          <div className="text-sm text-muted-foreground">{booking.customer.firstName} {booking.customer.lastName}</div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Dropoffs */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-emerald-600 flex items-center gap-2">↓ {t('dropoffs') || 'Rientri'}</h4>
                    {getDropoffsForDate(currentDate).length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('noDropoffs') || 'Nessun rientro'}</p>
                    ) : (
                      getDropoffsForDate(currentDate).map((booking: Booking) => (
                        <div 
                          key={booking.id} 
                          className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg cursor-pointer hover:bg-emerald-500/20"
                          onClick={() => router.push(`/${locale}/bookings/${booking.id}`)}
                        >
                          <div className="font-medium">{booking.vehicle.licensePlate}</div>
                          <div className="text-sm">{booking.vehicle.brand} {booking.vehicle.model}</div>
                          <div className="text-sm text-muted-foreground">{booking.customer.firstName} {booking.customer.lastName}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Day Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedDate ? formatDate(selectedDate.toISOString()) : t('selectDate')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('clickToSee')}
              </p>
            ) : selectedDateBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('noBookings')}
              </p>
            ) : (
              <div className="space-y-4">
                {selectedDateBookings.map((booking: Booking) => (
                  <div 
                    key={booking.id} 
                    className="border rounded-lg p-3 space-y-2 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => router.push(`/${locale}/bookings/${booking.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <Badge className={getStatusColor(booking.status)}>
                        {getStatusLabel(booking.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span>{booking.vehicle.brand} {booking.vehicle.model}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {booking.vehicle.licensePlate}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{booking.customer.firstName} {booking.customer.lastName}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-sm">{tb('statusConfirmed')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-sm">{tb('statusCheckedOut')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gray-500" />
              <span className="text-sm">{tb('statusCheckedIn')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-sm">{tb('statusCancelled')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
